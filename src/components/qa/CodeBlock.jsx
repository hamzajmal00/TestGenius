'use client';

import * as React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function CodeBlock({ code = '' }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <Box
      sx={{
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.100',
        borderRadius: 1.5,
        p: 1.5,
        maxHeight: 280,
        overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        whiteSpace: 'pre',
      }}
    >
      <Tooltip title={copied ? 'Copied' : 'Copy'}>
        <IconButton
          onClick={copy}
          size='small'
          sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'white' }}
        >
          <ContentCopyIcon fontSize='small' />
        </IconButton>
      </Tooltip>
      {code || '// —'}
    </Box>
  );
}
