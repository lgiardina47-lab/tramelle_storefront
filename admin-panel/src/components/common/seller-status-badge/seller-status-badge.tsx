import { StatusCell } from "@components/table/table-cells/common/status-cell";

export const SellerStatusBadge = ({
  status,
  "data-testid": dataTestId,
}: {
  status: string
  "data-testid"?: string
}) => {
  const key = (status || "").trim().toUpperCase()
  const label = key || status || "—"

  switch (key) {
    case "INACTIVE":
      return (
        <StatusCell color="orange" data-testid={dataTestId}>
          {label}
        </StatusCell>
      )
    case "ACTIVE":
      return (
        <StatusCell color="green" data-testid={dataTestId}>
          {label}
        </StatusCell>
      )
    case "SUSPENDED":
      return (
        <StatusCell color="red" data-testid={dataTestId}>
          {label}
        </StatusCell>
      )
    case "PENDING":
      return (
        <StatusCell color="grey" data-testid={dataTestId}>
          {label}
        </StatusCell>
      )
    default:
      return (
        <StatusCell color="grey" data-testid={dataTestId}>
          {label}
        </StatusCell>
      )
  }
};
