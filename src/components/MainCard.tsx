import { forwardRef, ReactNode } from 'react';
import {
  Card, CardContent, CardHeader, Divider, Typography,
  CardProps, CardHeaderProps, CardContentProps, Box,
} from '@mui/material';

interface MainCardProps {
  border?: boolean;
  boxShadow?: boolean;
  children?: ReactNode;
  content?: boolean;
  contentSX?: CardContentProps['sx'];
  darkTitle?: boolean;
  divider?: boolean;
  elevation?: number;
  secondary?: ReactNode;
  shadow?: string;
  sx?: CardProps['sx'];
  title?: ReactNode;
  [key: string]: any;
}

const MainCard = forwardRef<HTMLDivElement, MainCardProps>(
  (
    {
      border = true,
      boxShadow = false,
      children,
      content = true,
      contentSX = {},
      darkTitle = false,
      divider = true,
      elevation,
      secondary,
      shadow,
      sx = {},
      title,
      ...others
    },
    ref
  ) => {
    return (
      <Card
        elevation={elevation || 0}
        ref={ref}
        {...others}
        sx={{
          border: border ? '1px solid' : 'none',
          borderColor: 'grey.200',
          borderRadius: 2,
          boxShadow: boxShadow ? shadow || '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          ':hover': { boxShadow: boxShadow ? shadow || '0 4px 16px rgba(0,0,0,0.12)' : 'none' },
          ...sx,
        }}
      >
        {title && (
          <>
            <CardHeader
              sx={{ p: 2.5 }}
              titleTypographyProps={{ variant: darkTitle ? 'h5' : 'subtitle1', color: 'text.primary' }}
              title={title}
              action={secondary && <Box>{secondary}</Box>}
            />
            {divider && <Divider />}
          </>
        )}
        {content && <CardContent sx={{ p: 2.5, ...contentSX }}>{children}</CardContent>}
        {!content && children}
      </Card>
    );
  }
);

MainCard.displayName = 'MainCard';
export default MainCard;
