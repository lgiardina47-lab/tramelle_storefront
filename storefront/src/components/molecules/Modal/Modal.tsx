import { CloseIcon } from "@/icons"
import { cn } from "@/lib/utils"

export const Modal = ({
  children,
  heading,
  onClose,
  headingClassName,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode
  heading: string
  onClose: () => void
  /** Default: titolo editoriale (Cormorant). Per filtri listing usare variant DS. */
  headingClassName?: string
  "data-testid"?: string
}) => {
  return (
    <div
      className="fixed left-0 top-0 z-30 flex h-full w-full justify-center"
      data-testid={dataTestId ?? "modal"}
    >
      <div
        className="absolute h-full w-full bg-tertiary/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute z-20 my-20 max-h-[80vh] w-full max-w-[600px] overflow-y-auto rounded-sm bg-primary py-5 shadow-lg">
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b border-[#E8E4DE] px-4 pb-4",
            headingClassName ?? "heading-md uppercase"
          )}
        >
          {heading}
          <div onClick={onClose} className="cursor-pointer">
            <CloseIcon size={20} />
          </div>
        </div>
        <div className="pt-5">{children}</div>
      </div>
    </div>
  )
}
