import { Module } from "@medusajs/framework/utils"

import SellerListingProfileModuleService from "./service"

export const SELLER_LISTING_PROFILE_MODULE = "seller_listing_profile"

export default Module(SELLER_LISTING_PROFILE_MODULE, {
  service: SellerListingProfileModuleService,
})
