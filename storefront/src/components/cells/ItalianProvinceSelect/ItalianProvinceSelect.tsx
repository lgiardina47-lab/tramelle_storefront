'use client'

import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDown } from '@medusajs/icons'
import { clx } from '@medusajs/ui'
import clsx from 'clsx'
import { Fragment } from 'react'

import {
  ITALIAN_PROVINCES,
  provinceNameFromCode,
  resolveItalianProvinceCode,
} from '@/lib/helpers/italian-provinces'

type ItalianProvinceSelectProps = {
  name: string
  value: string | undefined
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  label: string
  placeholder: string
  'data-testid'?: string
}

export function ItalianProvinceSelect({
  name,
  value,
  onChange,
  label,
  placeholder,
  'data-testid': dataTestId,
}: ItalianProvinceSelectProps) {
  const selectedCode = resolveItalianProvinceCode(value ?? '')

  const handleSelect = (code: string) => {
    onChange({
      target: { name, value: code },
    } as React.ChangeEvent<HTMLSelectElement>)
  }

  const submitted =
    resolveItalianProvinceCode(value ?? '') ?? (value ?? '').trim()

  return (
    <label className="label-md">
      <input type="hidden" name={name} value={submitted} />
      <p className="mb-2">{label}</p>
      <Listbox
        value={selectedCode}
        onChange={v => {
          if (v) handleSelect(v)
        }}
      >
        <div className="relative">
          <Listbox.Button
            type="button"
            className={clsx(
              'relative flex h-12 w-full cursor-default items-center justify-between rounded-lg border bg-component-secondary px-4 text-left text-base-regular focus:border-primary focus:outline-none focus:ring-0'
            )}
            data-testid={dataTestId ?? 'shipping-province-select'}
          >
            {({ open }) => (
              <>
                <span className="block truncate">
                  {selectedCode
                    ? provinceNameFromCode(selectedCode)
                    : placeholder}
                </span>
                <ChevronUpDown
                  className={clx('transition-rotate duration-200', {
                    'rotate-180 transform': open,
                  })}
                />
              </>
            )}
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#d9d9d9] bg-white text-sm shadow-lg focus:outline-none">
              {ITALIAN_PROVINCES.map(({ code, name: provinceName }) => (
                <Listbox.Option
                  key={code}
                  value={code}
                  className="cursor-pointer select-none border-b border-[#f0f0f0] px-4 py-3 last:border-b-0 hover:bg-[#f5f5f5]"
                  data-testid="shipping-province-option"
                >
                  {provinceName}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </label>
  )
}
