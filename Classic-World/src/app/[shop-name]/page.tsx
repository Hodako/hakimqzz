import { getDb } from "@/lib/db";
import { StorefrontClient } from "@/components/storefront-client";

interface PageProps {
  params: Promise<{
    "shop-name": string;
  }>;
}

export default async function StorefrontPage(props: PageProps) {
  const params = await props.params;
  const shopName = params["shop-name"];

  if (!shopName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center font-sans">
        <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Store Not Found</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          The requested store URL is invalid.
        </p>
        <a
          href="/auth"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Go to Login
        </a>
      </div>
    );
  }

  try {
    const db = await getDb();
    const cleanSlug = (shopName || "").toLowerCase().trim();

    // Query business by slug
    let business = await db.collection("businesses").findOne({ slug: cleanSlug });

    // Fallback: Query business by name
    if (!business) {
      business = await db.collection("businesses").findOne({ name: shopName });
    }

    // Safety check: if no business found, show clean storefront 404
    if (!business) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center font-sans">
          <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Store Not Found</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            We couldn't find a storefront matching "<strong>{shopName}</strong>".
          </p>
          <a
            href="/auth"
            className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Go to Login
          </a>
        </div>
      );
    }

    // Query active products for this store owner
    const productsCursor = await db.collection("products").find({
      owner_id: business.owner_id,
      archived: { $ne: true }
    });
    
    const productsData = await productsCursor.toArray();

    const formattedProducts = productsData.map((p) => ({
      id: (p._id as any).toString(),
      name: (p.name as string) || "",
      sell_price: Number(p.sell_price) || 0,
      stock: Number(p.stock) || 0,
      category: (p.category as string) || "",
      description: (p.description as string) || "",
    }));

    const businessData = {
      name: (business.name as string) || "HakimQzz",
      logo_url: (business.logo_url as string) || "",
    };

    return (
      <StorefrontClient
        business={businessData}
        initialProducts={formattedProducts}
      />
    );
  } catch (error) {
    console.error("Storefront error:", error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center font-sans">
        <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          There was an error loading the storefront. Please try again later.
        </p>
        <a
          href="/auth"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Go to Login
        </a>
      </div>
    );
  }
}

export async function generateStaticParams() {
  return [{ "shop-name": "fallback" }];
}
