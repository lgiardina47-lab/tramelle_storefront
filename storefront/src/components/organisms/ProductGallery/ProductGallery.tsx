import { GalleryCarousel } from "@/components/organisms"
import { resolveProductThumbnailSrc } from "@/lib/helpers/get-image-url"
import { HttpTypes } from "@medusajs/types"

function resolveSlide(
  slide: HttpTypes.StoreProductImage
): HttpTypes.StoreProductImage {
  const abs = resolveProductThumbnailSrc(slide.url)
  const url = abs ?? slide.url ?? ""
  return { ...slide, url }
}

export const ProductGallery = ({
  images,
  thumbnailUrl,
}: {
  images: HttpTypes.StoreProduct["images"]
  /** Se la galleria è vuota ma c’è thumbnail Medusa, mostra almeno quella. */
  thumbnailUrl?: string | null
}) => {
  const list = images ?? []
  const raw: HttpTypes.StoreProduct["images"] =
    list.length > 0
      ? list
      : thumbnailUrl
        ? [
            {
              id: "__thumbnail__",
              url: thumbnailUrl,
              created_at: "",
              updated_at: "",
              deleted_at: null,
              metadata: null,
              rank: 0,
              product_id: "",
            } as HttpTypes.StoreProductImage,
          ]
        : []

  if (raw.length === 0) return null

  /** Server: espandi `cfimg:` → URL assoluti così Next/Image e i client vedono URL assoluti. */
  const slides = raw.map(resolveSlide)

  return (
    <div data-testid="product-gallery">
      <GalleryCarousel images={slides} />
    </div>
  )
}
