import { FC } from "react";
import { Box, Typography } from "@mui/material";
// CRA `import file.svg` returns the public URL string — works as <img src>.
import logoSvg from "../logo.svg";
import { BRAND } from "../themes/palette";

// ─────────────────────────────────────────────────────────────────────────────
// Logo — the Tramps Aviation brand mark
//
// Use this component wherever the brand mark is needed. Don't render
// `logo.svg` directly with <img> in feature code — go through this component
// so any brand refresh ripples everywhere at once.
//
//   <Logo size={36} />               icon-only, default 36×36
//   <Logo size={56} withHalo />      logo on a brand-blue tint halo
//   <Logo size={40} withWordmark />  icon + "Tramps Aviation" wordmark
//   <Logo size={56} variant="dark"/> halo turns brand-blue solid for dark hero
//
// Colour rules:
//   - Halo uses BRAND.BLUE (logo blue) — primary brand colour.
//   - Wordmark "Tramps Aviation" is BRAND.BLUE.
//   - Subtitle is BRAND.ORANGE — that's where the 20% accent shows.
// ─────────────────────────────────────────────────────────────────────────────
interface LogoProps {
  size?: number;
  withHalo?: boolean;
  withWordmark?: boolean;
  /** Subtitle under the wordmark; defaults to "Platform Control Panel" */
  subtitle?: string;
  /** Override the wordmark text */
  title?: string;
  /** "light" = halo on white pages | "dark" = solid blue halo for dark heroes */
  variant?: "light" | "dark";
}

const Logo: FC<LogoProps> = ({
  size = 36,
  withHalo = false,
  withWordmark = false,
  subtitle = "Platform Control Panel",
  title = "Tramps Aviation",
  variant = "light",
}) => {
  const dark = variant === "dark";

  const icon = (
    <Box
      component="img"
      src="/logo.svg"
      alt={title}
      sx={{
        width: size,
        height: size,
        display: "block",
        objectFit: "contain",
        flexShrink: 0,
        // The logo file has a white background; clip via border-radius so it
        // sits cleanly inside coloured halos.
        borderRadius: size >= 32 ? 1 : 0.5,
      }}
    />
  );

  const haloed = withHalo ? (
    <Box
      sx={{
        width: size + 14,
        height: size + 14,
        borderRadius: 2,
        background: dark
          ? BRAND.GRADIENT_BLUE // solid blue for dark heroes
          : `linear-gradient(135deg, ${BRAND.BLUE_TINT} 0%, ${BRAND.BLUE_LIGHT} 100%)`,
        border: "2px solid",
        borderColor: dark ? BRAND.BLUE_DARK : BRAND.BLUE,
        boxShadow: dark
          ? "0 6px 18px rgba(32, 154, 205, 0.35)"
          : "0 4px 14px rgba(32, 154, 205, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
  ) : (
    icon
  );

  if (!withWordmark) return haloed;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      {haloed}
      <Box>
        <Typography
          variant="h5"
          sx={{
            color: dark ? "#fff" : BRAND.BLUE,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            fontSize: "1.1rem",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              // Orange accent on subtitle — the 20% brand orange shows here
              color: dark ? "rgba(255,255,255,0.9)" : BRAND.ORANGE,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontSize: "0.62rem",
              display: "block",
              mt: 0.3,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Logo;
