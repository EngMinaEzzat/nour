import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
  schema?: any;
  price?: number;
  availability?: string;
  noindex?: boolean;
  imageWidth?: string;
  imageHeight?: string;
}

export function SEO({ title, description, image, url, type = "website", schema, price, availability, noindex, imageWidth, imageHeight }: SEOProps) {
  const siteName = "MatjarEg Platform"; // Or could be passed via context
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      {image && imageWidth && <meta property="og:image:width" content={imageWidth} />}
      {image && imageHeight && <meta property="og:image:height" content={imageHeight} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content={siteName} />

      {type === "product" && price != null && (
        <meta property="product:price:amount" content={price.toString()} />
      )}
      {type === "product" && price != null && (
        <meta property="product:price:currency" content="EGP" />
      )}
      {type === "product" && availability && (
        <meta property="product:availability" content={availability === "https://schema.org/InStock" ? "instock" : "oos"} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
