"use client"
import { Button, Card } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { Divider, Heading } from "@medusajs/ui"
import { PencilSquare } from "@medusajs/icons"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Modal } from "../Modal/Modal"
import { ProfileDetailsForm } from "../ProfileDetailsForm/ProfileDetailsForm"

export const ProfileDetails = ({ user }: { user: HttpTypes.StoreCustomer }) => {
  const t = useTranslations("Account")
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <Card className="bg-secondary p-4 flex justify-between items-center" data-testid="profile-details-header">
        <Heading level="h2" className="heading-sm uppercase" data-testid="profile-details-heading">
          {t("profileDetailsSection")}
        </Heading>
        <Button
          variant="tonal"
          onClick={() => setShowForm(true)}
          className="uppercase flex items-center gap-2 font-semibold"
          data-testid="profile-edit-button"
        >
          <PencilSquare />
          {t("profileEditDetails")}
        </Button>
      </Card>
      <Card className="p-0" data-testid="profile-details-info">
        <div className="p-4" data-testid="profile-name">
          <p className="label-md text-secondary" data-testid="profile-name-label">{t("profileNameLabel")}</p>
          <p className="label-lg text-primary" data-testid="profile-name-value">
            {`${user.first_name} ${user.last_name}`}
          </p>
        </div>
        <Divider />
        <div className="p-4" data-testid="profile-email">
          <p className="label-md text-secondary" data-testid="profile-email-label">{t("profileEmailLabel")}</p>
          <p className="label-lg text-primary" data-testid="profile-email-value">{user.email}</p>
        </div>
        <Divider />
        <div className="p-4" data-testid="profile-phone">
          <p className="label-md text-secondary" data-testid="profile-phone-label">{t("profilePhoneLabel")}</p>
          <p className="label-lg text-primary" data-testid="profile-phone-value">{user.phone}</p>
        </div>
      </Card>
      {showForm && (
        <Modal
          heading={t("profileEditModalTitle")}
          onClose={() => setShowForm(false)}
        >
          <ProfileDetailsForm
            handleClose={() => setShowForm(false)}
            defaultValues={{
              firstName: user.first_name || "",
              lastName: user.last_name || "",
              phone: user.phone || "",
              email: user.email || "",
            }}
          />
        </Modal>
      )}
    </>
  )
}
