"use client"

import { Button } from "@/components/atoms"
import { SellerReview } from "@/components/molecules"
import { SingleProductReview } from "@/types/product"
import { useTranslations } from "next-intl"

export const ProductDetailsSellerReviews = ({
  reviews,
}: {
  reviews: SingleProductReview[]
}) => {
  const t = useTranslations("ProductSheet")
  return (
    <div className="p-4 border rounded-sm" data-testid="product-seller-reviews-section">
      <div className="flex justify-between items-center mb-5">
        <h4 className="uppercase heading-sm">{t("sellerReviewsHeading")}</h4>
        <Button
          variant="tonal"
          className="uppercase label-md font-400"
          data-testid="product-seller-reviews-see-more"
        >
          {t("seeMore")}
        </Button>
      </div>
      {reviews.map((review) => (
        <SellerReview
          key={review.id}
          review={review}
          data-testid={`product-seller-review-${review.id}`}
        />
      ))}
    </div>
  )
}
