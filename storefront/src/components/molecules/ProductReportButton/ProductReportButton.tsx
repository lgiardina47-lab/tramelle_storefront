"use client"

import { Button } from "@/components/atoms"
import { useState } from "react"
import { Modal } from "../Modal/Modal"
import { ReportListingForm } from "../ReportListingForm/ReportListingForm"
import { useTranslations } from "next-intl"

export const ProductReportButton = () => {
  const [openModal, setOpenModal] = useState(false)
  const t = useTranslations("ProductSheet")
  return (
    <>
      <Button
        className="uppercase label-md"
        variant="tonal"
        onClick={() => setOpenModal(true)}
      >
        {t("reportListing")}
      </Button>
      {openModal && (
        <Modal
          heading={t("reportListingModalHeading")}
          onClose={() => setOpenModal(false)}
        >
          <ReportListingForm onClose={() => setOpenModal(false)} />
        </Modal>
      )}
    </>
  )
}
