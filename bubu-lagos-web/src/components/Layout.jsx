import { Header } from './Header';
import { Footer } from './Footer';
import { Meta } from './Meta';

export function Layout({ children, headerVariant, title, description, image }) {
  return (
    <div className="min-h-screen flex flex-col font-primary text-black">
      <Meta title={title} description={description} image={image} />
      <Header variant={headerVariant} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
