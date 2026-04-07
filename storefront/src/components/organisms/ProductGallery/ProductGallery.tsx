import { GalleryCarousel } from '@/components/organisms'
import { HttpTypes } from '@medusajs/types'

export const ProductGallery = ({
  images,
  thumbnailUrl,
}: {
  images: HttpTypes.StoreProduct['images']
  /** Se la galleria è vuota ma c’è thumbnail Medusa, mostra almeno quella. */
  thumbnailUrl?: string | null
}) => {
  const slides: HttpTypes.StoreProduct['images'] =
    images?.length > 0
      ? images
      : thumbnailUrl
        ? [
            {
              id: '__thumbnail__',
              url: thumbnailUrl,
              created_at: '',
              updated_at: '',
              deleted_at: null,
              metadata: null,
              rank: 0,
              product_id: '',
            } as HttpTypes.StoreProductImage,
          ]
        : []

  if (!slides.length) return null

  return (
    <div data-testid="product-gallery">
      <GalleryCarousel images={slides} />
    </div>
  )
}
