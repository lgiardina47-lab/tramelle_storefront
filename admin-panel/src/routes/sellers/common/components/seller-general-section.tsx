import { PencilSquare, User } from "@medusajs/icons";
import { Container, Divider, Heading, Text, usePrompt } from "@medusajs/ui";
import type { HttpTypes } from "@medusajs/types";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { VendorSeller } from "@custom-types/seller";

import { ActionsButton } from "@components/common/actions-button";
import { SellerStatusBadge } from "@components/common/seller-status-badge";

import { useProductCategories } from "@hooks/api/categories";
import { useUpdateSeller } from "@hooks/api/sellers";
import {
  getAdminSellerBannerUrl,
  getAdminSellerGalleryUrls,
  getAdminSellerLogoCandidates,
  getAdminSellerPartitaIva,
  getAdminSellerRea,
  getAdminSellerRegion,
  getAdminSellerSdi,
  getAdminSellerTasteCategoryHandles,
  getAdminSellerWebsiteUrl,
  hrefForWebsiteDisplay,
} from "@utils/admin-seller-media";

function tasteCategoryRowsForSeller(
  handles: string[],
  categories: HttpTypes.AdminProductCategory[] | undefined,
): { handle: string; label: string }[] {
  if (!handles.length) {
    return [];
  }
  if (!categories?.length) {
    return handles.map((h) => ({ handle: h, label: h }));
  }
  const byHandle = new Map(categories.map((c) => [c.handle, c]));
  const byId = new Map(categories.map((c) => [c.id, c]));
  return handles.map((h) => {
    const c = byHandle.get(h);
    if (!c) {
      return { handle: h, label: `${h} (handle non trovato nel catalogo)` };
    }
    const parent = c.parent_category_id ? byId.get(c.parent_category_id) : undefined;
    const name = c.name ?? h;
    const label = parent?.name ? `${parent.name} → ${name}` : name;
    return { handle: h, label };
  });
}

function LogoCandidatesPreview({ seller }: { seller: VendorSeller }) {
  const candidates = useMemo(() => getAdminSellerLogoCandidates(seller), [seller]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [seller.id, candidates.join("|")]);

  if (!candidates.length || index >= candidates.length) {
    return (
      <Text size="small" className="text-ui-fg-muted" data-testid="seller-media-logo-empty">
        —
      </Text>
    );
  }

  const url = candidates[index]!;

  return (
    <div className="max-w-md overflow-hidden rounded-md border border-ui-border-base">
      <img
        src={url}
        alt=""
        className="max-h-40 w-full object-contain bg-ui-bg-subtle p-2"
        onError={() => setIndex((i) => i + 1)}
        data-testid="seller-media-logo-img"
      />
    </div>
  );
}

function MediaImagePreview({ url, label }: { url: string | null; label: string }) {
  const [broken, setBroken] = useState(false);

  if (!url || broken) {
    return (
      <Text size="small" className="text-ui-fg-muted" data-testid={`seller-media-${label}-empty`}>
        —
      </Text>
    );
  }

  return (
    <div className="max-w-md overflow-hidden rounded-md border border-ui-border-base">
      <img
        src={url}
        alt=""
        className="max-h-40 w-full object-cover"
        onError={() => setBroken(true)}
        data-testid={`seller-media-${label}-img`}
      />
    </div>
  );
}

function GalleryAdminPreview({ urls }: { urls: string[] }) {
  const [broken, setBroken] = useState(() => new Set<number>());

  if (!urls.length) {
    return (
      <Text size="small" className="text-ui-fg-muted" data-testid="seller-media-gallery-empty">
        —
      </Text>
    );
  }

  if (!urls.some((_, i) => !broken.has(i))) {
    return (
      <Text size="small" className="text-ui-fg-muted" data-testid="seller-media-gallery-all-broken">
        —
      </Text>
    );
  }

  return (
    <div className="flex max-w-lg flex-wrap gap-2" data-testid="seller-media-gallery-strip">
      {urls.map((u, i) =>
        broken.has(i) ? null : (
          <a
            key={`${u}-${i}`}
            href={u}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-20 w-20 shrink-0 overflow-hidden rounded border border-ui-border-base bg-ui-bg-component-hover"
          >
            <img
              src={u}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBroken((prev) => new Set(prev).add(i))}
            />
          </a>
        ),
      )}
    </div>
  );
}

export const SellerGeneralSection = ({ seller }: { seller: VendorSeller }) => {
  const navigate = useNavigate();

  const { mutateAsync: suspendSeller } = useUpdateSeller();

  const dialog = usePrompt();

  const websiteRaw = getAdminSellerWebsiteUrl(seller);
  const websiteHref = websiteRaw ? hrefForWebsiteDisplay(websiteRaw) : null;
  const bannerUrl = getAdminSellerBannerUrl(seller);
  const galleryUrls = getAdminSellerGalleryUrls(seller);
  const region = getAdminSellerRegion(seller);
  const tasteHandles = useMemo(
    () => getAdminSellerTasteCategoryHandles(seller),
    [seller],
  );
  const partitaIva = useMemo(() => getAdminSellerPartitaIva(seller), [seller]);
  const rea = useMemo(() => getAdminSellerRea(seller), [seller]);
  const sdi = useMemo(() => getAdminSellerSdi(seller), [seller]);

  const { product_categories: allProductCategories, isLoading: tasteCategoriesLoading } =
    useProductCategories(
      tasteHandles.length
        ? {
            limit: 500,
            fields: "id,name,handle,parent_category_id",
          }
        : undefined,
      { enabled: tasteHandles.length > 0 },
    );

  const tasteRows = useMemo(
    () => tasteCategoryRowsForSeller(tasteHandles, allProductCategories),
    [tasteHandles, allProductCategories],
  );

  const handleSuspend = async () => {
    const res = await dialog({
      title:
        seller.store_status === "SUSPENDED"
          ? "Activate account"
          : "Suspend account",
      description:
        seller.store_status === "SUSPENDED"
          ? "Are you sure you want to activate this account?"
          : "Are you sure you want to suspend this account?",
      verificationText: seller.email || seller.name || "",
    });

    if (!res) {
      return;
    }

    if (seller.store_status === "SUSPENDED") {
      await suspendSeller({ id: seller.id, data: { store_status: "ACTIVE" } });
    } else {
      await suspendSeller({
        id: seller.id,
        data: { store_status: "SUSPENDED" },
      });
    }
  };

  return (
    <>
      <div>
        <Container className="mb-2" data-testid="seller-general-section-header">
          <div className="flex items-center justify-between">
            <Heading data-testid="seller-general-section-name">{seller.email || seller.name}</Heading>
            <div className="flex items-center gap-2">
              <SellerStatusBadge status={seller.store_status || "pending"} data-testid="seller-general-section-status-badge" />
              <ActionsButton
                data-testid="seller-general-section-action-menu"
                actions={[
                  {
                    label: "Edit",
                    onClick: () => navigate(`/sellers/${seller.id}/edit`),
                    icon: <PencilSquare />,
                  },
                  {
                    label:
                      seller.store_status === "SUSPENDED"
                        ? "Activate account"
                        : "Suspend account",
                    onClick: () => handleSuspend(),
                    icon: <User />,
                  },
                ]}
              />
            </div>
          </div>
        </Container>
      </div>
      <div className="flex gap-4">
        <Container className="px-0" data-testid="seller-general-section-store">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <Heading data-testid="seller-general-section-store-heading">Store</Heading>
            </div>
          </div>
          <div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-store-name-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-store-name-label">Name</Text>
              <Text className="w-1/2" data-testid="seller-general-section-store-name-value">{seller.name}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-store-email-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-store-email-label">Email</Text>
              <Text className="w-1/2" data-testid="seller-general-section-store-email-value">{seller.email}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-store-phone-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-store-phone-label">Phone</Text>
              <Text className="w-1/2" data-testid="seller-general-section-store-phone-value">{seller.phone}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-store-description-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-store-description-label">
                Description
              </Text>
              <Text className="w-1/2" data-testid="seller-general-section-store-description-value">{seller.description}</Text>
            </div>
            <Divider />
            <div className="flex items-start px-8 py-4" data-testid="seller-general-section-store-website-row">
              <Text className="w-1/2 shrink-0 font-medium text-ui-fg-subtle" data-testid="seller-general-section-store-website-label">
                Website
              </Text>
              <div className="w-1/2 min-w-0">
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="txt-small text-ui-fg-interactive hover:underline break-all"
                    data-testid="seller-general-section-store-website-link"
                  >
                    {websiteRaw}
                  </a>
                ) : (
                  <Text size="small" className="text-ui-fg-muted">
                    —
                  </Text>
                )}
              </div>
            </div>
            <Divider />
            <div className="px-8 py-4" data-testid="seller-general-section-taste-categories">
              <Text
                weight="plus"
                size="small"
                className="text-ui-fg-subtle mb-3"
                data-testid="seller-general-section-taste-heading"
              >
                Categorie Taste
              </Text>
              {tasteHandles.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted" data-testid="seller-general-section-taste-empty">
                  Nessuna categoria collegata (metadata <code className="txt-compact-xsmall">taste_category_handles</code>).
                </Text>
              ) : tasteCategoriesLoading ? (
                <Text size="small" className="text-ui-fg-muted">
                  Caricamento categorie…
                </Text>
              ) : (
                <ul className="flex flex-col gap-2 list-none m-0 p-0" data-testid="seller-general-section-taste-list">
                  {tasteRows.map(({ handle, label }) => (
                    <li key={handle}>
                      <Text size="small" leading="compact" className="text-ui-fg-base">
                        {label}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted font-mono break-all">
                        /{handle}
                      </Text>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Divider />
            <div className="flex items-start px-8 py-4" data-testid="seller-general-section-store-logo-row">
              <Text className="w-1/2 shrink-0 font-medium text-ui-fg-subtle" data-testid="seller-general-section-store-logo-label">
                Logo
              </Text>
              <div className="w-1/2">
                <LogoCandidatesPreview seller={seller} />
              </div>
            </div>
            <Divider />
            <div className="flex items-start px-8 py-4" data-testid="seller-general-section-store-banner-row">
              <Text className="w-1/2 shrink-0 font-medium text-ui-fg-subtle" data-testid="seller-general-section-store-banner-label">
                Banner
              </Text>
              <div className="w-1/2">
                <MediaImagePreview url={bannerUrl} label="banner" />
              </div>
            </div>
            <Divider />
            <div className="flex items-start px-8 py-4" data-testid="seller-general-section-store-gallery-row">
              <Text className="w-1/2 shrink-0 font-medium text-ui-fg-subtle" data-testid="seller-general-section-store-gallery-label">
                Gallery (storytelling)
              </Text>
              <div className="w-1/2">
                <GalleryAdminPreview urls={galleryUrls} />
              </div>
            </div>
          </div>
        </Container>
        <Container className="px-0" data-testid="seller-general-section-address">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <Heading data-testid="seller-general-section-address-heading">Address</Heading>
            </div>
          </div>
          <div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-address-line-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-address-line-label">
                Address
              </Text>
              <Text className="w-1/2" data-testid="seller-general-section-address-line-value">{seller.address_line}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-postal-code-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-postal-code-label">
                Postal Code
              </Text>
              <Text className="w-1/2" data-testid="seller-general-section-postal-code-value">{seller.postal_code}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-city-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-city-label">City</Text>
              <Text className="w-1/2" data-testid="seller-general-section-city-value">{seller.city}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-region-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-region-label">
                Regione
              </Text>
              <Text className="w-1/2" data-testid="seller-general-section-region-value">
                {region || "—"}
              </Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-country-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-country-label">
                Country
              </Text>
              <Text className="w-1/2" data-testid="seller-general-section-country-value">
                {seller.country_code?.trim()
                  ? seller.country_code.trim().toUpperCase()
                  : "—"}
              </Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-tax-id-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-tax-id-label">TaxID</Text>
              <Text className="w-1/2" data-testid="seller-general-section-tax-id-value">{seller.tax_id?.trim() || "—"}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-piva-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-piva-label">
                P.IVA
              </Text>
              <Text className="w-1/2" data-testid="seller-general-section-piva-value">
                {partitaIva || "—"}
              </Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-rea-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-rea-label">
                REA
              </Text>
              <Text className="w-1/2" data-testid="seller-general-section-rea-value">
                {rea || "—"}
              </Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4" data-testid="seller-general-section-sdi-row">
              <Text className="w-1/2 font-medium text-ui-fg-subtle" data-testid="seller-general-section-sdi-label">
                SDI
              </Text>
              <Text className="w-1/2 font-mono text-sm" data-testid="seller-general-section-sdi-value">
                {sdi || "—"}
              </Text>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
};
