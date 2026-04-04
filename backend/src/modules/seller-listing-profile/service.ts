import { MedusaService } from "@medusajs/framework/utils"

import { SellerListingProfile } from "./models/seller-listing-profile"

class SellerListingProfileModuleService extends MedusaService({
  SellerListingProfile,
}) {}

export default SellerListingProfileModuleService
