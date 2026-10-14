import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ResultEntry, TimelinePoint } from '../../api/results'
import { chartColours } from '../../theme/tokens'
import { formatLocalTime, parseUtc } from '../../utils/time'

// Every chart has a text table under it, and every slice or bar carries a label. See AC-R4.

function ChartCard({ title, children, table }: { title: string; children: React.ReactNode; table: React.ReactNode }) {
  return (
    <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }} aria-label={title}>
      <Typography variant="h3" component="h2" gutterBottom>
        {title}
      </Typography>
      <Box aria-hidden sx={{ width: '100%' }}>
        {children}
      </Box>
      <Box sx={{ mt: 2 }}>{table}</Box>
    </Paper>
  )
}

export function VotesBarChart({ entries }: { entries: ResultEntry[] }) {
  const theme = useTheme()
  const data = entries.map((e, i) => ({ name: e.title, votes: e.votes, colour: chartColours[i % chartColours.length] }))
  const height = Math.max(160, entries.length * 44 + 40)

  return (
    <ChartCard
      title="Votes per entry"
      table={
        <Table size="small" aria-label="Votes per entry, as a table">
          <TableHead>
            <TableRow>
              <TableCell>Entry</TableCell>
              <TableCell>By</TableCell>
              <TableCell align="right">Votes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.entryId}>
                <TableCell>
                  {e.title}
                  {e.isWinner && ' (winner)'}
                </TableCell>
                <TableCell>{e.ownerLabel}</TableCell>
                <TableCell align="right">{e.votes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} stroke={theme.palette.divider} />
          <XAxis type="number" allowDecimals={false} stroke={theme.palette.text.secondary} />
          <YAxis type="category" dataKey="name" width={140} stroke={theme.palette.text.secondary} tick={{ fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: theme.palette.action.hover }}
            contentStyle={{ background: theme.palette.background.paper, borderColor: theme.palette.divider, borderRadius: 8 }}
          />
          <Bar dataKey="votes" radius={[0, 6, 6, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.colour} />
            ))}
            <LabelList dataKey="votes" position="right" fill={theme.palette.text.primary} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ShareDonut({ entries, totalVotes }: { entries: ResultEntry[]; totalVotes: number }) {
  const theme = useTheme()
  const data = entries.filter((e) => e.votes > 0).map((e, i) => ({ name: e.title, value: e.votes, share: e.sharePercent, colour: chartColours[entries.indexOf(e) % chartColours.length], i }))

  return (
    <ChartCard
      title="Share of votes"
      table={
        <Table size="small" aria-label="Share of votes, as a table">
          <TableHead>
            <TableRow>
              <TableCell>Entry</TableCell>
              <TableCell align="right">Votes</TableCell>
              <TableCell align="right">Share</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.entryId}>
                <TableCell>{e.title}</TableCell>
                <TableCell align="right">{e.votes}</TableCell>
                <TableCell align="right">{e.sharePercent.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {totalVotes}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                100%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      }
    >
      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No votes were cast.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              isAnimationActive={false}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: theme.palette.text.secondary }}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.colour} stroke={theme.palette.background.paper} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ color: theme.palette.text.primary }} />
            <Tooltip contentStyle={{ background: theme.palette.background.paper, borderColor: theme.palette.divider, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

export function VotesTimeline({ timeline }: { timeline: TimelinePoint[] }) {
  const theme = useTheme()
  const data = timeline.map((p) => ({ t: parseUtc(p.atUtc).getTime(), votes: p.cumulativeVotes }))

  return (
    <ChartCard
      title="Votes over time"
      table={
        <Table size="small" aria-label="Votes over time, as a table">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell align="right">Cumulative votes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timeline.map((p) => (
              <TableRow key={`${p.atUtc}-${p.cumulativeVotes}`}>
                <TableCell>{formatLocalTime(p.atUtc)}</TableCell>
                <TableCell align="right">{p.cumulativeVotes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    >
      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No votes were cast.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid stroke={theme.palette.divider} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              stroke={theme.palette.text.secondary}
              tick={{ fontSize: 12 }}
            />
            <YAxis allowDecimals={false} stroke={theme.palette.text.secondary} />
            <Tooltip
              labelFormatter={(t) => formatLocalTime(new Date(Number(t)).toISOString())}
              contentStyle={{ background: theme.palette.background.paper, borderColor: theme.palette.divider, borderRadius: 8 }}
            />
            <Line type="stepAfter" dataKey="votes" stroke={chartColours[0]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
