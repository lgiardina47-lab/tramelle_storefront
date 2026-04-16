import { useState, useCallback, useEffect } from 'react'

export const useCategoryDropdown = () => {
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)
  const [shouldRenderDropdown, setShouldRenderDropdown] = useState(false)

  const toggleDropdown = useCallback((categoryId: string) => {
    setHoveredCategoryId((prev) => (prev === categoryId ? null : categoryId))
  }, [])

  const closeDropdown = useCallback(() => {
    setHoveredCategoryId(null)
  }, [])

  useEffect(() => {
    if (hoveredCategoryId) {
      setShouldRenderDropdown(true)
      const t = window.setTimeout(() => setIsDropdownVisible(true), 20)
      return () => clearTimeout(t)
    }
    setIsDropdownVisible(false)
    const t = window.setTimeout(() => setShouldRenderDropdown(false), 200)
    return () => clearTimeout(t)
  }, [hoveredCategoryId])

  useEffect(() => {
    if (!shouldRenderDropdown) return

    const handlePageScroll = () => {
      closeDropdown()
    }

    window.addEventListener('scroll', handlePageScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handlePageScroll)
    }
  }, [shouldRenderDropdown, closeDropdown])

  return {
    hoveredCategoryId,
    isDropdownVisible,
    shouldRenderDropdown,
    toggleDropdown,
    closeDropdown,
    setHoveredCategoryId,
  }
}
