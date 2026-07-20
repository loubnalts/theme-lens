export const prefixMap: Record<string, string[]> = {
    // Colors
    bg: ['color'],
    text: ['color', 'text'],
    border: ['color', 'border-width'],
    ring: ['color'],
    fill: ['color'],
    stroke: ['color'],
    outline: ['color'],
    divide: ['color'],
    from: ['color'],
    via: ['color'],
    to: ['color'],
    decoration: ['color'],
    placeholder: ['color'],
    caret: ['color'],
    accent: ['color'],

    // Shadows
    shadow: ['shadow'],
    'drop-shadow': ['shadow'],

    // Spacing
    p: ['spacing'],
    px: ['spacing'],
    py: ['spacing'],
    pt: ['spacing'],
    pb: ['spacing'],
    pl: ['spacing'],
    pr: ['spacing'],
    m: ['spacing'],
    mx: ['spacing'],
    my: ['spacing'],
    mt: ['spacing'],
    mb: ['spacing'],
    ml: ['spacing'],
    mr: ['spacing'],
    gap: ['spacing'],
    'space-x': ['spacing'],
    'space-y': ['spacing'],
    inset: ['spacing'],
    top: ['spacing'],
    right: ['spacing'],
    bottom: ['spacing'],
    left: ['spacing'],

    // Typography
    font: ['font'],

    // Border radius
    rounded: ['radius', 'rounded'],

    // Opacity
    opacity: ['opacity'],
    'bg-opacity': ['opacity'],
    'text-opacity': ['opacity'],
    'border-opacity': ['opacity'],

    // Z-index
    z: ['z'],
    w: ['width'],
    h: ['height'],
    'max-w': ['max-width'],
    'min-w': ['min-width'],
    leading: ['line-height'],
    tracking: ['letter-spacing'],
}

export const propertyMap: Record<string, string> = {
    // Colors
    bg: 'background-color',
    text: 'color', // default, override for font-size below
    border: 'border-color',
    ring: '--tw-ring-color',
    fill: 'fill',
    stroke: 'stroke',
    outline: 'outline-color',
    divide: 'border-color',
    from: '--tw-gradient-from',
    via: '--tw-gradient-via',
    to: '--tw-gradient-to',
    decoration: 'text-decoration-color',
    placeholder: 'color',
    caret: 'caret-color',
    accent: 'accent-color',

    // Shadows
    shadow: 'box-shadow',
    'drop-shadow': 'filter',

    // Spacing
    p: 'padding',
    px: 'padding-inline',
    py: 'padding-block',
    pt: 'padding-top',
    pb: 'padding-bottom',
    pl: 'padding-left',
    pr: 'padding-right',
    m: 'margin',
    mx: 'margin-inline',
    my: 'margin-block',
    mt: 'margin-top',
    mb: 'margin-bottom',
    ml: 'margin-left',
    mr: 'margin-right',
    gap: 'gap',
    'space-x': 'margin-inline-start',
    'space-y': 'margin-block-start',
    inset: 'inset',
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',

    // Typography
    font: 'font-family',

    // Border radius
    rounded: 'border-radius',

    // Opacity
    opacity: 'opacity',
    'bg-opacity': '--tw-bg-opacity',
    'text-opacity': '--tw-text-opacity',
    'border-opacity': '--tw-border-opacity',

    // Z-index
    z: 'z-index',
}
