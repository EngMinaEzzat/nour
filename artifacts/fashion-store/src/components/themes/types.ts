import type { StorefrontResponse } from "@workspace/api-client-react";

export interface StorefrontProps {
    store: StorefrontResponse;
    products: any[];
    categories: any[];
}
