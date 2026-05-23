import { useMemo, useState, type ChangeEvent, type CSSProperties, type DragEvent } from 'react'
import { Icon } from './Icon'

type ImageSlotProps = {
  id: string
  src?: string
  placeholder?: string
  shape?: 'rect' | 'rounded' | 'circle' | 'pill'
  radius?: number
  fit?: 'cover' | 'contain' | 'fill'
  position?: string
  className?: string
  style?: CSSProperties
}

export function ImageSlot({
  id,
  src,
  placeholder = 'Drop an image',
  shape = 'rounded',
  radius = 12,
  fit = 'cover',
  position = '50% 50%',
  className = '',
  style,
}: ImageSlotProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isOver, setIsOver] = useState(false)

  const url = preview ?? src
  const borderRadius = useMemo(() => {
    if (shape === 'circle') return '50%'
    if (shape === 'pill') return '999px'
    if (shape === 'rounded') return `${radius}px`
    return 0
  }, [radius, shape])

  function readFile(file?: File) {
    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.addEventListener('load', () => setPreview(String(reader.result)))
    reader.readAsDataURL(file)
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsOver(false)
    readFile(event.dataTransfer.files[0])
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    readFile(event.currentTarget.files?.[0])
    event.currentTarget.value = ''
  }

  return (
    <label
      className={`dq-placeholder ${className}`.trim()}
      data-over={isOver}
      htmlFor={id}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      style={{
        borderRadius,
        cursor: 'pointer',
        minHeight: 140,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {url ? (
        <img alt="" src={url} style={{ width: '100%', height: '100%', objectFit: fit, objectPosition: position, display: 'block' }} />
      ) : (
        <span style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
          <Icon name="photo" size={28} />
          {placeholder}
        </span>
      )}
      <input accept="image/*" hidden id={id} onChange={onChange} type="file" />
    </label>
  )
}
