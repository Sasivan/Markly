import { A } from '@solidjs/router'
import DitherButton from '../dither-kit/solid/DitherButton'
import DitherAsciiText from '../dither-kit/solid/AsciiText'

export default function NotFound() {
  return (
    <div class="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
      <DitherAsciiText text="404" class="text-accent text-3xl font-mono" />
      <div class="space-y-2 max-w-sm">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Section Not Found</h1>
        <p class="text-xs text-muted-foreground">
          The requested coordinate or link does not exist in this archive workspace.
        </p>
      </div>
      <div>
        <A href="/">
          <DitherButton variant="gradient">
            Return to Homepage
          </DitherButton>
        </A>
      </div>
    </div>
  )
}
