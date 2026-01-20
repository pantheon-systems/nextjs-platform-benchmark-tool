import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn more about our platform benchmark tool',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About This Benchmark</h1>

        <div className="prose prose-lg">
          <p className="text-xl mb-4">
            This is a realistic medium-sized Next.js application designed to benchmark
            build and deployment performance across different hosting platforms.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Purpose</h2>
          <p>
            The application contains a representative mix of pages, components, and features
            that simulate a real-world web application. This helps ensure fair and meaningful
            performance comparisons.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Features</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Multiple page routes with different rendering strategies</li>
            <li>API routes for server-side functionality</li>
            <li>Reusable components with Tailwind CSS styling</li>
            <li>Image optimization capabilities</li>
            <li>TypeScript for type safety</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Technology Stack</h2>
          <div className="bg-gray-100 p-6 rounded-lg mt-4">
            <ul className="space-y-2">
              <li><strong>Framework:</strong> Next.js 15+</li>
              <li><strong>Language:</strong> TypeScript</li>
              <li><strong>Styling:</strong> Tailwind CSS</li>
              <li><strong>Routing:</strong> App Router</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
