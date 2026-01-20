import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Latest updates and insights',
};

const posts = [
  {
    id: 1,
    title: 'Understanding Build Times in Modern Web Development',
    excerpt: 'A deep dive into what affects build performance and how to optimize it.',
    date: '2024-01-15',
    author: 'Engineering Team',
    readTime: '5 min read',
  },
  {
    id: 2,
    title: 'Platform Comparison: What to Look For',
    excerpt: 'Key metrics and features to consider when choosing a hosting platform.',
    date: '2024-01-10',
    author: 'DevOps Team',
    readTime: '7 min read',
  },
  {
    id: 3,
    title: 'The Evolution of Next.js Deployment',
    excerpt: 'How deployment strategies have changed with Next.js 14 and beyond.',
    date: '2024-01-05',
    author: 'Platform Team',
    readTime: '6 min read',
  },
  {
    id: 4,
    title: 'Optimizing for Core Web Vitals',
    excerpt: 'Best practices for improving your application\'s performance metrics.',
    date: '2024-01-01',
    author: 'Performance Team',
    readTime: '8 min read',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-xl text-gray-600 mb-12">
          Insights and updates from our team
        </p>

        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.id}
              className="border-b border-gray-200 pb-8 last:border-0"
            >
              <Link href={`/blog/${post.id}`} className="group">
                <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
              </Link>

              <div className="flex items-center text-sm text-gray-500 mb-3 space-x-4">
                <span>{post.date}</span>
                <span>•</span>
                <span>{post.author}</span>
                <span>•</span>
                <span>{post.readTime}</span>
              </div>

              <p className="text-gray-700 mb-4">{post.excerpt}</p>

              <Link
                href={`/blog/${post.id}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
