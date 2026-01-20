import { Metadata } from 'next';
import ProductCard from '@/components/ProductCard';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse our product catalog',
};

const products = [
  {
    id: 1,
    name: 'Starter Plan',
    description: 'Perfect for small projects and personal sites',
    price: '$10/month',
    features: ['5GB Storage', '100GB Bandwidth', 'SSL Certificate', '24/7 Support'],
  },
  {
    id: 2,
    name: 'Professional Plan',
    description: 'For growing businesses and applications',
    price: '$25/month',
    features: ['50GB Storage', '500GB Bandwidth', 'SSL Certificate', 'Priority Support', 'CDN Included'],
  },
  {
    id: 3,
    name: 'Enterprise Plan',
    description: 'Custom solutions for large-scale applications',
    price: 'Custom',
    features: ['Unlimited Storage', 'Unlimited Bandwidth', 'SSL Certificate', 'Dedicated Support', 'CDN Included', 'Custom SLA'],
  },
];

export default function ProductsPage() {
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Our Products</h1>
        <p className="text-xl text-gray-600 mb-12">
          Choose the perfect plan for your needs
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
