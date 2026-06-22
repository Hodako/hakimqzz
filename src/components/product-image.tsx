import { Package } from "lucide-react";

export function ProductImage({ path, className = "" }: { path: string | null; className?: string }) {
  if (!path) {
    return (
      <div className={`bg-secondary/40 grid place-items-center p-1.5 ${className}`}>
        <img
          src="https://img.icons8.com/clouds/100/product.png"
          className="w-2/3 h-2/3 max-w-[48px] object-contain"
          alt="product"
        />
      </div>
    );
  }
  return <img src={path} className={`object-cover ${className}`} alt="" loading="lazy" />;
}