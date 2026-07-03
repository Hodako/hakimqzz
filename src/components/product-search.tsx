"use client";

import { useState, useMemo } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/format";
import type { Product } from "@/lib/queries";
import { useT } from "@/lib/i18n";

interface ProductSearchProps {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
  showPrice?: boolean;
  placeholder?: string;
}

/** Searchable product picker for buy/sell dialogs. Inline design avoids modal/keyboard conflicts. */
export function ProductSearchSelect({ products, value, onChange, showPrice, placeholder }: ProductSearchProps) {
  const { t, lang } = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedProduct = products.find(p => p.id === value);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  // Handle when user selects a product
  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative w-full select-none">
      {selectedProduct && !isOpen ? (
        <div className="flex items-center justify-between border border-input rounded-md px-3 h-9 bg-background text-sm">
          <span className="truncate flex-1 font-medium text-zinc-900 dark:text-zinc-100">
            {selectedProduct.name} {showPrice && `· ${fmtMoney(selectedProduct.sell_price)}`} ({selectedProduct.stock})
          </span>
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2.5 text-[11px] ml-2 hover:bg-muted text-primary active:scale-95 transition-all shrink-0"
            onClick={() => {
              setIsOpen(true);
              setSearchQuery("");
            }}
          >
            {lang === "bn" ? "পরিবর্তন" : "Change"}
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            type="text"
            className="w-full pr-8 h-9 text-sm bg-background border-border/80"
            placeholder={placeholder ?? t("select_product")}
            value={searchQuery}
            autoFocus={isOpen}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              // Delay closing the dropdown so that click event on options has time to fire
              setTimeout(() => setIsOpen(false), 200);
            }}
          />
          <ChevronsUpDown className="absolute right-2.5 top-2.5 size-4 opacity-50 pointer-events-none" />

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-md max-h-48 overflow-y-auto divide-y divide-border/60">
              {filteredProducts.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  {t("no_products")}
                </div>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2 active:bg-accent/60"
                    onMouseDown={() => handleSelect(p.id)} // onMouseDown fires before onBlur, making selection instant!
                  >
                    <span className="font-medium truncate flex-1 text-zinc-900 dark:text-zinc-100">{p.name}</span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {showPrice && `${fmtMoney(p.sell_price)} · `}({p.stock})
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
