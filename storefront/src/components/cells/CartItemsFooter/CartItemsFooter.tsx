import { convertToLocale } from '@/lib/helpers/money';
import { useTranslations } from 'next-intl';

export const CartItemsFooter = ({
  currency_code,
  price,
  label,
  hint,
}: {
  currency_code: string;
  price: number;
  /** es. "Consegna da Amedei" */
  label?: string;
  hint?: string;
}) => {
  const t = useTranslations('Cart');
  return (
    <div className="flex flex-col gap-1 rounded-sm border p-4 label-md">
      <div className="flex items-center justify-between">
        <p className="text-secondary">{label ?? t('delivery')}</p>
        <p className="font-medium text-primary">
          {convertToLocale({
            amount: price,
            currency_code,
          })}
        </p>
      </div>
      {hint ? <p className="text-xs text-[#6d7175]">{hint}</p> : null}
    </div>
  );
};
