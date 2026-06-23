import { AdminLayout } from '../components/AdminLayout';
import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { getImageUrl, formatNGN } from '../../lib/utils';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';

export function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    categoryId: '',
    images: [], // Can be URLs (existing) or File objects
    videoUrl: '', // Existing URL
    videoFile: null, // New file
    variants: []
  });

  const [previews, setPreviews] = useState([]);
  // [FIX #45] 300ms debounce on the search input.
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // 300ms debounce on search.
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // [FIX] Revoke the *previous* batch of blob: URLs in cleanup, not the new ones.
  // This avoids leaking blob URLs when the user navigates away mid-upload.
  const prevPreviewsRef = useRef([]);
  useEffect(() => {
    const newPreviews = formData.images.map((img) => {
      if (typeof img === 'string') return getImageUrl(img);
      return URL.createObjectURL(img);
    });
    setPreviews(newPreviews);
    prevPreviewsRef.current = newPreviews;

    return () => {
      // Revoke only the batch that this effect created; a later effect will create
      // new ones and revoke those on its own cleanup.
      newPreviews.forEach((p) => {
        if (typeof p === 'string' && p.startsWith('blob:')) URL.revokeObjectURL(p);
      });
    };
  }, [formData.images]);

  // Revoke any remaining blob URLs when the modal unmounts (e.g. user navigates away).
  useEffect(() => {
    return () => {
      prevPreviewsRef.current.forEach((p) => {
        if (typeof p === 'string' && p.startsWith('blob:')) URL.revokeObjectURL(p);
      });
      prevPreviewsRef.current = [];
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.get('/products');
      setProducts(data.products || []);
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get('/categories');
      setCategories(data.categories || []);
    } catch (err) {
      logger.error('Failed to fetch categories:', err);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      basePrice: '',
      categoryId: '',
      images: [],
      videoUrl: '',
      videoFile: null,
      variants: []
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      basePrice: product.basePrice,
      categoryId: product.categoryId || '',
      images: product.images || [],
      videoUrl: product.videoUrl || '',
      videoFile: null,
      variants: (product.variants || []).map((v) => ({ ...v, sku: v.sku || '' }))
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        videoFile: file
      }));
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // [FIX #22] Image reordering buttons.
  const moveImage = (index, dir) => {
    setFormData((prev) => {
      const next = [...prev.images];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, images: next };
    });
  };

  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: '', sku: '', price: '', stockQuantity: 0 }]
    }));
  };

  const removeVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const updateVariant = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.basePrice || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('description', formData.description);
      form.append('basePrice', formData.basePrice);
      form.append('categoryId', formData.categoryId);

      // Separate existing URLs from new files
      const existingImages = formData.images.filter((img) => typeof img === 'string');
      const newImageFiles = formData.images.filter((img) => typeof img !== 'string');

      existingImages.forEach((img) => form.append('images', img));
      newImageFiles.forEach((file) => form.append('images', file));

      if (formData.videoFile) {
        form.append('video', formData.videoFile);
      } else if (formData.videoUrl) {
        form.append('videoUrl', formData.videoUrl);
      }

      form.append('variants', JSON.stringify(formData.variants));

      if (editingProduct) {
        // [FIX] Use PUT for updates so we don't accidentally create duplicates.
        await api.upload(`/products/${editingProduct.id}`, form, 'PUT');
        toast.success('Product updated');
      } else {
        await api.upload('/products', form);
        toast.success('Product created');
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      logger.error('Failed to save product:', err);
      toast.error('Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (stock) => {
    if (stock === 0) return 'bg-red-100 text-red-700';
    if (stock < 10) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = (stock) => {
    if (stock === 0) return 'Out of Stock';
    if (stock < 10) return 'Low Stock';
    return 'In Stock';
  };

  const getTotalStock = (product) => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    }
    return 0;
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (product) => {
    setPendingDelete(product);
  };

  const confirmDelete = async () => {
    const product = pendingDelete;
    setPendingDelete(null);
    if (!product) return;
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      logger.error('Failed to delete product:', err);
      toast.error('Failed to delete product. Please try again.');
    }
  };


  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">Manage your product inventory</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <label htmlFor="products-search" className="sr-only">Search products</label>
            <input
              id="products-search"
              type="search"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            Loading the collection...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-900">Product</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Category</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Price</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Stock</th>
                    <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => {
                    const totalStock = getTotalStock(product);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  src={getImageUrl(product.images[0])}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon size={20} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <span className="font-medium text-gray-900">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{product.category?.name || '-'}</td>
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          {formatNGN(product.basePrice)}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{totalStock}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(totalStock)}`}>
                            {getStatusText(totalStock)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-2 text-gray-400 hover:text-black transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Showing {filteredProducts.length} of {products.length} products</span>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Piece' : 'Add Piece'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Piece Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price (₦) *
                  </label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video (optional)
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="w-full py-4 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    <Upload size={24} className="mb-2" />
                    <span className="text-sm">
                      {formData.videoFile ? formData.videoFile.name : (formData.videoUrl ? 'Re-upload Video' : 'Add Product Video')}
                    </span>
                  </label>
                </div>
                {formData.videoUrl && !formData.videoFile && (
                  <p className="text-xs text-gray-400 mt-1">Current video: {formData.videoUrl.split('/').pop()}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="w-full py-4 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mb-2" size={24} />
                    ) : (
                      <Upload size={24} className="mb-2" />
                    )}
                    <span className="text-sm">
                      {loading ? 'Uploading...' : 'Click to add images'}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Max 10 images</span>
                  </button>
                </div>

                {previews.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Product ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        {index === 0 && (
                          <span className="absolute top-1 left-1 text-[8px] font-bold uppercase tracking-widest bg-black text-white px-1 rounded">Cover</span>
                        )}
                        <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            aria-label={`Move image ${index + 1} up`}
                            className="bg-white/90 text-gray-700 rounded px-1 text-[10px] hover:bg-white disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(index, 1)}
                            disabled={index === previews.length - 1}
                            aria-label={`Move image ${index + 1} down`}
                            className="bg-white/90 text-gray-700 rounded px-1 text-[10px] hover:bg-white disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Variants (Sizes/Colors)
                  </label>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="text-sm text-black hover:underline"
                  >
                    + Add Variant
                  </button>
                </div>

                {formData.variants.length > 0 && (
                  <div className="space-y-2">
                    {formData.variants.map((variant, index) => (
                      <div key={index} className="flex gap-2 items-center flex-wrap">
                        <input
                          type="text"
                          placeholder="Name (e.g., Small, Red)"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="SKU"
                          value={variant.sku || ''}
                          onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        />
                        <input
                          type="number"
                          placeholder="Price (₦)"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Stock"
                          value={variant.stockQuantity}
                          onChange={(e) => updateVariant(index, 'stockQuantity', e.target.value)}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          aria-label={`Remove variant ${index + 1}`}
                          className="p-2 text-red-500 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded outline-none"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove piece?"
        description={
          pendingDelete
            ? `Are you sure you want to remove "${pendingDelete.name}" from the collection? This cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AdminLayout>
  );
}
