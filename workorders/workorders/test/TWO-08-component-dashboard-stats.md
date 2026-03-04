# TWO-08: Component Tests — Dashboard & Stats

**Status:** Not Started
**Dependencies:** WO-09, WO-14, TWO-01

---

## Test Suites

### 1. Dashboard Tests (`src/pages/DashboardPage.test.tsx`)

- Shows welcome message with user name
- Daily session card renders with correct block count
- Stats row shows rating, accuracy, streak, XP
- Quick action buttons render and navigate correctly
- Due items count is accurate
- Coach tip renders

### 2. SessionRunner Tests (`src/components/training/SessionRunner.test.tsx`)

- Displays all session blocks
- Current block highlighted
- Timer starts on block activation
- Block completion marks it done
- Progress bar advances

### 3. Chart Tests (`src/components/stats/`)

Mock `ResponsiveContainer` for Recharts:

- RatingChart renders with data points
- ThemeAccuracyChart shows all 10 themes
- SkillRadar renders 5 axes
- StudyHeatmap renders day grid
- All charts handle empty data gracefully

### 4. XpDisplay Tests (`src/components/gamification/XpDisplay.test.tsx`)

- Shows correct level title
- Progress bar width matches XP progress
- XP earned today displays

---

## Files Created

```
src/pages/DashboardPage.test.tsx
src/components/training/SessionRunner.test.tsx
src/components/stats/RatingChart.test.tsx
src/components/stats/ThemeAccuracyChart.test.tsx
src/components/stats/SkillRadar.test.tsx
src/components/stats/StudyHeatmap.test.tsx
src/components/gamification/XpDisplay.test.tsx
```
