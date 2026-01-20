interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  features: string[];
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
      <h3 className="text-2xl font-bold mb-2">{product.name}</h3>
      <p className="text-gray-600 mb-4">{product.description}</p>
      <div className="text-3xl font-bold text-blue-600 mb-6">{product.price}</div>

      <ul className="space-y-3 mb-8">
        {product.features.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-700">
            <svg
              className="w-5 h-5 mr-2 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
        Get Started
      </button>
    </div>
  );
}
