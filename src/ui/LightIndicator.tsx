import { Circle } from './Circle';
import { Color } from '../core/theme/color';
import { Box } from '@mui/material';
import { FC } from 'react';

type Props = {
  statusList: boolean[];
};

export const LightIndicator: FC<Props> = ({ statusList }) => (
  <Box sx={{ display: 'flex' }}>
    {statusList.map((status, key) => (
      <Circle key={key} color={status ? Color.green : Color.black} size={32} />
    ))}
  </Box>
);
