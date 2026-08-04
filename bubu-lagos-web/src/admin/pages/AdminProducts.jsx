import { AdminLayout } from '../components/AdminLayout';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, X, Upload, Image as ImageIcon, Loader2, ArrowLeft, Film } from 'lucide-react';
import api from '../../utils/api';
import { getImageUrl, formatNGN } from '../../lib/utils';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { TableRowSkeleton } from '../../components/Skeleton';

const LUXURY_PRESET_COLORS = [
  // Signature & Classic Neutrals
  { name: 'Royal Emerald', hex: '#0F3D2E' },
  { name: 'Metallic Gold', hex: '#D4AF37' },
  { name: 'Midnight Black', hex: '#1A1A1A' },
  { name: 'Ivory Silk', hex: '#F5F5DC' },
  { name: 'Champagne Gold', hex: '#F7E7CE' },
  { name: 'Pure White', hex: '#FFFFFF' },

  // Warm & Metallic Tones
  { name: 'Bronze', hex: '#CD7F32' },
  { name: 'Rose Gold', hex: '#B76E79' },
  { name: 'Terracotta', hex: '#E2725B' },
  { name: 'Burnt Orange', hex: '#CC5500' },
  { name: 'Mustard Gold', hex: '#E1AD01' },
  { name: 'Coral Pink', hex: '#F88379' },

  // Rich Jewel Tones
  { name: 'Ruby Red', hex: '#9B111E' },
  { name: 'Sunset Crimson', hex: '#800020' },
  { name: 'Regal Purple', hex: '#4B0082' },
  { name: 'Plum Wine', hex: '#58111A' },
  { name: 'Sapphire Blue', hex: '#0F2C59' },
  { name: 'Cobalt Navy', hex: '#00205B' },
  { name: 'Turquoise Teal', hex: '#008080' },
  { name: 'Sage Olive', hex: '#556B2F' },

  // Soft Pastels & Earth Tones
  { name: 'Blush Pink', hex: '#FFD1DC' },
  { name: 'Lavender Mist', hex: '#E6E6FA' },
  { name: 'Powder Blue', hex: '#B0E0E6' },
  { name: 'Taupe Nude', hex: '#B38B6D' },
  { name: 'Rich Mocha', hex: '#4A2C2A' },
  { name: 'Charcoal Grey', hex: '#36454F' }
];

export function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const importCsvRef = useRef(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    categoryId: '',
    collections: [], // Selected collection IDs or slugs
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
    fetchCollections();
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

  const fetchCollections = async () => {
    try {
      const data = await api.get('/collections');
      setCollections(data.collections || []);
    } catch (err) {
      logger.error('Failed to fetch collections:', err);
    }
  };

  const openModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: "This piece is designed with a free-flowing silhouette. It is a universal 'One Size Fits All' that comfortably fits UK/US sizes 8 through 20.",
      basePrice: '',
      categoryId: '',
      collections: [],
      images: [],
      videoUrl: '',
      videoFile: null,
      colorPalette: ['#1B365D', '#D4AF37'],
      suggestedProductIds: [],
      variants: [{ name: 'One Size (Fits 8 - 20)', sku: '', price: '', stockQuantity: 50 }]
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    const prodColIds = (product.collections || []).map(c => c.id || c);
    setFormData({
      name: product.name,
      description: product.description || '',
      basePrice: product.basePrice,
      categoryId: product.categoryId || '',
      collections: prodColIds,
      images: product.images || [],
      videoUrl: product.videoUrl || '',
      videoFile: null,
      colorPalette: product.colorPalette || product.color_palette || [],
      suggestedProductIds: product.suggestedProductIds || product.suggested_product_ids || [],
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
      const maxVideoSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxVideoSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`Video "${file.name}" is too large (${sizeMB}MB). Maximum allowed video size is 50MB. Please compress it first.`);
        e.target.value = '';
        return;
      }
      setFormData((prev) => ({
        ...prev,
        videoFile: file
      }));
      toast.success(`Video attached: ${file.name}`);
    }
  };

  const removeVideo = () => {
    setFormData((prev) => ({
      ...prev,
      videoFile: null,
      videoUrl: ''
    }));
    toast.info('Video removed');
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
      form.append('collections', JSON.stringify(formData.collections));
      form.append('colorPalette', JSON.stringify(formData.colorPalette || []));
      form.append('suggestedProductIds', JSON.stringify(formData.suggestedProductIds || []));

      // Separate existing URLs from new files
      const existingImages = formData.images.filter((img) => typeof img === 'string');
      const newImageFiles = formData.images.filter((img) => typeof img !== 'string');

      existingImages.forEach((img) => form.append('images', img));
      newImageFiles.forEach((file) => form.append('images', file));

      if (formData.videoFile) {
        form.append('video', formData.videoFile);
      } else if (formData.videoUrl) {
        form.append('videoUrl', formData.videoUrl);
      } else {
        form.append('videoUrl', '');
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
      const serverMsg = err?.data?.error || err?.response?.data?.error || err?.message;
      if (serverMsg?.includes('413') || serverMsg?.toLowerCase().includes('large') || serverMsg?.toLowerCase().includes('entity too large')) {
        toast.error('Upload Error: File size is too large for the server. Please compress your images or video.');
      } else if (serverMsg) {
        toast.error(`Upload Error: ${serverMsg}`);
      } else {
        toast.error('Failed to save product. Please check your network connection and try again.');
      }
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

  const handleImportCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      // Simple CSV parser supporting quotes (naive)
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
      
      if (rows.length < 2) {
        toast.error('CSV file is empty or missing headers');
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const catIdx = headers.findIndex(h => h.includes('category'));
      const colIdx = headers.findIndex(h => h.includes('collection'));
      const priceIdx = headers.findIndex(h => h.includes('price'));
      const stockIdx = headers.findIndex(h => h.includes('stock'));

      if (nameIdx === -1 || priceIdx === -1) {
        toast.error('CSV must contain at least "Name" and "Base Price" columns');
        setImporting(false);
        e.target.value = '';
        return;
      }

      const productsToImport = [];

      for (let i = 1; i < rows.length; i++) {
        if (!rows[i] || rows[i].length < 2) continue;
        
        const name = rows[i][nameIdx];
        const categoryName = catIdx !== -1 ? rows[i][catIdx] : '';
        const basePrice = parseFloat(rows[i][priceIdx]);
        const stock = stockIdx !== -1 ? parseInt(rows[i][stockIdx], 10) : 0;

        if (!name || isNaN(basePrice)) continue;

        // Try to find category id by name, or use first category
        let categoryId = categories.length > 0 ? categories[0].id : null;
        if (categoryName) {
          const found = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
          if (found) categoryId = found.id;
        }

        const collectionNames = colIdx !== -1 && rows[i][colIdx] ? rows[i][colIdx].split(';').map(n => n.trim()).filter(Boolean) : [];
        let collectionIds = [];
        for (const cName of collectionNames) {
          const found = collections.find(c => c.name.toLowerCase() === cName.toLowerCase());
          if (found) collectionIds.push(found.id);
        }

        productsToImport.push({
          name,
          basePrice,
          categoryId,
          collectionIds,
          variants: [
            {
              name: 'One Size',
              price: basePrice,
              stockQuantity: isNaN(stock) ? 0 : stock
            }
          ]
        });
      }

      if (productsToImport.length === 0) {
        toast.error('No valid products found in CSV');
        setImporting(false);
        e.target.value = '';
        return;
      }

      const res = await api.post('/products/bulk', { products: productsToImport });
      toast.success(`Successfully imported ${res.count || productsToImport.length} products`);
      fetchProducts();
    } catch (err) {
      logger.error('Failed to import CSV:', err);
      toast.error('Failed to import products');
    } finally {
      setImporting(false);
      e.target.value = ''; // reset
    }
  };


  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-black hover:bg-gray-100 transition-colors flex items-center justify-center"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-500 text-sm">Manage your product inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = [
                ['Name', 'Category', 'Collections', 'Base Price', 'Total Stock', 'Variants'],
                ...filteredProducts.map(p => {
                  const stock = p.variants ? p.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) : 0;
                  const variantCount = p.variants ? p.variants.length : 0;
                  const colls = p.collections ? p.collections.map(c => c.name).join(';') : '';
                  return [p.name, p.category?.name || '—', colls, p.basePrice, stock, variantCount];
                })
              ];
              const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            Export CSV
          </button>
          
          <input
            type="file"
            accept=".csv"
            ref={importCsvRef}
            onChange={handleImportCsv}
            className="hidden"
          />
          <button
            onClick={() => importCsvRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5 flex items-center gap-2 disabled:opacity-50"
          >
            {importing ? <div className="h-4 w-4 rounded shimmer-light" /> : <Upload size={16} />}
            Import CSV
          </button>

          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={6} />
                ))
              ) : (
                filteredProducts.map((product) => {
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
                  })
              )}
            </tbody>
          </table>
        </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Showing {filteredProducts.length} of {products.length} products</span>
            </div>
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
                    Category (What Product IS) *
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
                  Merchandising Collections (Belongs to multiple)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {collections.map(col => {
                    const isChecked = formData.collections.includes(col.id);
                    return (
                      <label key={col.id} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, collections: [...prev.collections, col.id] }));
                            } else {
                              setFormData(prev => ({ ...prev, collections: prev.collections.filter(id => id !== col.id) }));
                            }
                          }}
                          className="rounded text-black focus:ring-black"
                        />
                        <span>{col.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Cloth Color Palette (1-3 Colors) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Cloth Color Palette (1 - 3 Colors Maximum)
                  </label>
                  <span className="text-xs text-gray-500 font-mono">
                    {(formData.colorPalette || []).length}/3 Selected
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Used on shop cards as visual overlays and powers smart complementary turban/accessory suggestions.
                </p>
                
                {/* Current Swatches */}
                <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {(formData.colorPalette || []).map((hex, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
                      <span className="w-5 h-5 rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: hex }} />
                      <span className="text-xs font-mono font-medium text-gray-800">{hex}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            colorPalette: prev.colorPalette.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="text-gray-400 hover:text-red-600 ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {(formData.colorPalette || []).length < 3 && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="color-picker-input"
                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !formData.colorPalette.includes(val)) {
                            setFormData(prev => ({ ...prev, colorPalette: [...prev.colorPalette, val] }));
                          }
                        }}
                      />
                      <span className="text-xs text-gray-400">Pick color or click preset below</span>
                    </div>
                  )}
                </div>

                {/* Luxury Presets */}
                {(formData.colorPalette || []).length < 3 && (
                  <div className="flex flex-wrap gap-1.5">
                    {LUXURY_PRESET_COLORS.map(preset => {
                      const isSelected = (formData.colorPalette || []).includes(preset.hex);
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          disabled={isSelected}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, colorPalette: [...(prev.colorPalette || []), preset.hex] }));
                          }}
                          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                            isSelected ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: preset.hex }} />
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Smart Product Suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suggested Matching Pieces (e.g. Turbans & Accessories)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Pick complementary pieces to suggest on Product Detail and Cart. If empty, the engine automatically matches matching turbans by color palette.
                </p>
                <div className="max-h-36 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1.5">
                  {products
                    .filter(p => p.id !== editingProduct?.id)
                    .map(p => {
                      const isSelected = (formData.suggestedProductIds || []).includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center justify-between text-xs p-1.5 hover:bg-white rounded cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({ ...prev, suggestedProductIds: [...(prev.suggestedProductIds || []), p.id] }));
                                } else {
                                  setFormData(prev => ({ ...prev, suggestedProductIds: (prev.suggestedProductIds || []).filter(id => id !== p.id) }));
                                }
                              }}
                              className="rounded text-black focus:ring-black"
                            />
                            <span className="font-medium text-gray-800">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{p.category?.name || 'Item'}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Video (Optional - Max 50MB)
                  </label>
                  {(formData.videoFile || formData.videoUrl) && (
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove Video
                    </button>
                  )}
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/mov,video/x-quicktime,.mov,.mp4,.webm,.qt"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="w-full py-3 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    <Film size={24} className="mb-2 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {formData.videoFile
                        ? formData.videoFile.name
                        : (formData.videoUrl ? 'Re-upload Video' : 'Add Product Video')}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Supports .MP4, .MOV, .WEBM (Max 50MB)</span>
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
                      <div className="h-6 w-6 rounded shimmer-light mb-2" />
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
