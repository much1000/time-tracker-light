'use client'

import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>

// Passwortfeld mit «Anzeigen»-Schalter. Das Passwort ist beim Laden verdeckt und
// wird beim Absenden des Formulars wieder verdeckt.
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    const innerRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)

    React.useEffect(() => {
      const form = innerRef.current?.form
      if (!form) return
      const hide = () => setVisible(false)
      form.addEventListener('submit', hide)
      return () => form.removeEventListener('submit', hide)
    }, [])

    return (
      <div className="relative">
        <Input
          {...props}
          ref={innerRef}
          type={visible ? 'text' : 'password'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn('h-11 pr-12', className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
          disabled={props.disabled}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
    )
  }
)
PasswordInput.displayName = 'PasswordInput'
