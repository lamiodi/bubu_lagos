const { Client } = require('pg');
require('dotenv').config();

const descriptions = {
  "The AMEERAH Dress  I": "A breathtaking silhouette crafted for the modern muse. Flowing flawlessly with every step, this dress embodies true African luxury, combining exquisite tailoring with an effortless sense of grace.",
  "The AMEERAH Dress  II": "An elevated reimagining of a classic, designed for those who command the room. Crafted from premium, breathable fabrics with meticulous attention to drape and movement.",
  "The OSARE Dress I": "A masterpiece of understated elegance. This piece offers a refined balance of cultural heritage and contemporary sophistication, perfect for elegant evenings.",
  "The OSARE Dress II": "A striking evolution of the Osare silhouette. This garment drapes beautifully, offering a luxuriously soft feel and a tailored aesthetic that exudes effortless glamour.",
  "The KIMANI KIMONO SET": "A luxurious two-piece ensemble that redefines relaxed elegance. Expertly crafted for a fluid drape, this kimono set transitions seamlessly from daytime luxury to evening sophistication.",
  "The MORAYO Dress I": "Radiating joy and sophistication, the Morayo is a testament to fine craftsmanship. Its cascading silhouette and premium texture make it an unforgettable wardrobe staple.",
  "The MORAYO Dress II": "An opulent variation of our signature Morayo design. With enhanced detailing and a sweeping silhouette, it is designed for the woman who appreciates timeless luxury.",
  "The KHALIDA Jacquard Dress": "Woven to perfection, this jacquard dress features rich, tactile patterns that catch the light beautifully. A true statement piece for the most exclusive occasions.",
  "The EGO Dress": "Bold, confident, and endlessly chic. The Ego dress is tailored to celebrate the feminine form while maintaining a modest, high-fashion appeal.",
  "The HABIBAH Dress I": "A vision of pure elegance. This exquisitely draped dress combines traditional inspirations with a sleek, modern finish for a truly cosmopolitan look.",
  "The AREWA Dress ": "Celebrating classic beauty with a modern twist. The Arewa dress features a meticulously constructed silhouette designed to offer supreme comfort and undeniable style.",
  "The ZAHRA Dress": "A delicate and radiant creation. The Zahra dress flows with a fluid grace, making it the perfect choice for intimate gatherings and grand celebrations alike.",
  "The DAMILOLA Dress": "Luxurious and refined, the Damilola dress showcases impeccable tailoring and a graceful flow, capturing the essence of modern African couture.",
  "The LAYALI Dress ": "Inspired by the magic of the night, this dress offers a stunningly dramatic drape. A beautifully constructed piece that guarantees you will be the center of attention.",
  "The LILY Dress": "Soft, romantic, and perfectly structured. The Lily dress features a gentle silhouette that flatters effortlessly, crafted from the finest lightweight materials.",
  "The SORAYA Organza Layered Gown": "A majestic creation featuring sheer organza overlays and structured tailoring. This layered gown brings an ethereal, dreamlike quality to your luxury collection.",
  "The RAHEEMA Dress": "A harmonious blend of bold presence and delicate details. The Raheema dress flows beautifully, offering a masterclass in relaxed, opulent dressing.",
  "The Red Dress ": "A striking statement piece rendered in a passionate, vivid hue. This dress commands attention with its flawless drape and unforgettable presence.",
  "The Blue Dress": "Imbued with the calming elegance of deep waters, this striking blue dress offers a sophisticated silhouette tailored for ultimate luxury."
};

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  const res = await client.query('SELECT id, name FROM bubu.products');
  
  for (const product of res.rows) {
    const desc = descriptions[product.name] || "A stunning addition to the Bubu Lagos collection, designed with impeccable craftsmanship and an eye for modern luxury.";
    
    // Clean up the name spacing (e.g. "The AMEERAH Dress  I" -> "The AMEERAH Dress I")
    const cleanName = product.name.replace(/\s+/g, ' ').trim();

    await client.query(
      'UPDATE bubu.products SET name = $1, description = $2 WHERE id = $3',
      [cleanName, desc, product.id]
    );
    console.log(`Updated: ${cleanName}`);
  }

  await client.end();
}

main().catch(console.error);
