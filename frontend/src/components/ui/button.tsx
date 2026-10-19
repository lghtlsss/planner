import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-transparent bg-clip-padding text-[14px] leading-[20px] font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-brand-primary/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-pressed disabled:bg-brand-primary-disabled disabled:text-white",
        outline:
          "border-border-subtle bg-surface text-text-main hover:bg-bg-page active:bg-delo-bg disabled:border-border-subtle disabled:text-text-placeholder",
        secondary:
          "bg-brand-primary-light text-brand-primary hover:bg-brand-primary-100 active:bg-brand-primary-disabled/60 disabled:opacity-50",
        ghost:
          "bg-transparent text-text-secondary hover:bg-bg-page hover:text-text-main active:bg-delo-bg disabled:opacity-50",
        destructive:
          "bg-danger-light text-danger hover:bg-deadline-red-bg active:bg-danger/20 disabled:opacity-50",
        dashed:
          "border-dashed border-border-strong bg-surface text-text-secondary hover:border-brand-primary hover:bg-brand-primary-light hover:text-brand-primary active:bg-brand-primary-100 data-[active=true]:border-solid data-[active=true]:border-brand-primary data-[active=true]:bg-brand-primary-light data-[active=true]:text-brand-primary",
        link: "text-brand-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-4",
        xs: "h-7 gap-1 rounded-[8px] px-2.5 text-[12px] leading-[16px] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-[8px] px-3 text-[13px] leading-[18px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-[15px] leading-[22px]",
        icon: "size-9 rounded-[8px] border-border-subtle bg-surface text-text-secondary hover:bg-bg-page hover:text-text-main",
        "icon-xs": "size-7 rounded-[6px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-[8px]",
        "icon-lg": "size-10 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
