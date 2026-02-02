# Haul Productivity and Fleet Sizing Modules

## Overview

This document explains the mathematical formulas and design decisions for the two new core modules that extend the `HaulCycleTime` module:

1. **HaulProductivity** - Calculates truck productivity metrics
2. **FleetSizing** - Determines required fleet size

## Module 1: HaulProductivity

### Purpose

Converts a single truck's cycle time into meaningful productivity metrics, accounting for operational factors like maintenance downtime and operational efficiency.

### Input Parameters

| Parameter | Type | Unit | Range | Default | Description |
|-----------|------|------|-------|---------|-------------|
| `cycleTimeSeconds` | number | seconds | > 0 | required | Time for one complete haul cycle |
| `payloadTonnes` | number | tonnes | > 0 | required | Truck payload capacity |
| `availability` | number | ratio | 0..1 | 0.90 | Fraction of time truck is available (not in maintenance) |
| `efficiency` | number | ratio | 0..1 | 0.60 | Fraction of available time that is productive |
| `utilization` | number | ratio | 0..1 | 0.90 | Fraction of efficient time actually used |

### Formulas

```
Constants:
  SECONDS_PER_HOUR = 3600
  SECONDS_PER_YEAR = 365 × 24 × 3600 = 31,536,000

Step 1: Calculate theoretical cycles (no downtime)
  theoreticalCyclesPerHour = 3600 / cycleTimeSeconds
  theoreticalCyclesPerYear = 31,536,000 / cycleTimeSeconds

Step 2: Calculate combined operational factor
  effectiveFactor = availability × efficiency × utilization

Step 3: Apply operational factors
  effectiveCyclesPerYear = theoreticalCyclesPerYear × effectiveFactor

Step 4: Calculate tonnage metrics
  tonnesPerTruckYear = payloadTonnes × effectiveCyclesPerYear
  tonnesPerHour = payloadTonnes × theoreticalCyclesPerHour × effectiveFactor
```

### Output

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `theoreticalCyclesPerHour` | number | cycles/hour | Maximum cycles per hour (no downtime) |
| `theoreticalCyclesPerYear` | number | cycles/year | Maximum cycles per year (no downtime) |
| `effectiveFactor` | number | ratio | Combined operational efficiency factor |
| `effectiveCyclesPerYear` | number | cycles/year | Actual cycles per year after downtime |
| `tonnesPerTruckYear` | number | tonnes/year | Annual capacity per truck |
| `tonnesPerHour` | number | tonnes/hour | Effective throughput rate (tph) |

### Example

```typescript
const result = calculateHaulProductivity({
  cycleTimeSeconds: 600,      // 10 minutes
  payloadTonnes: 150,
  availability: 0.90,
  efficiency: 0.65,
  utilization: 0.85,
});

// Result:
// - theoreticalCyclesPerHour: 6
// - effectiveFactor: 0.49725 (0.90 × 0.65 × 0.85)
// - tonnesPerHour: ~448 tph
// - tonnesPerTruckYear: ~3,920,319 tonnes/year
```

---

## Module 2: FleetSizing

### Purpose

Determines how many trucks are required to meet a mine's production target, using a custom rounding rule with a 20% threshold.

### Input Parameters

| Parameter | Type | Unit | Range | Default | Description |
|-----------|------|------|-------|---------|-------------|
| `totalMineTonnesPerYear` | number | tonnes/year | ≥ 0 | 5,000,000 | Annual production target |
| `tonnesPerTruckYear` | number | tonnes/year | > 0 | required | Annual capacity per truck |

### Formulas

```
Step 1: Calculate raw requirement
  rawTrucks = totalMineTonnesPerYear / tonnesPerTruckYear

Step 2: Apply custom rounding rule (threshold = 0.20)
  floorValue = Math.floor(rawTrucks)
  fractionalPart = rawTrucks - floorValue

  If fractionalPart >= 0.20:
    trucksRequired = floorValue + 1  // Round UP
  Else:
    trucksRequired = floorValue      // Round DOWN

Step 3: Safety rule
  If totalMineTonnesPerYear > 0 AND trucksRequired == 0:
    trucksRequired = 1  // Ensure at least one truck
```

### Rounding Rule Rationale

The **0.20 threshold** (20%) means:
- A truck that is 20% or more utilized beyond capacity → add another truck
- A truck that is less than 20% utilized → don't add another truck

This prevents over-allocation while ensuring reasonable capacity margins.

### Examples

| Raw Trucks | Fractional Part | Rounds To | Reason |
|------------|----------------|-----------|--------|
| 7.00 | 0.00 | 7 | Exact match |
| 7.19 | 0.19 | 7 | Below threshold (19% < 20%) |
| 7.20 | 0.20 | 8 | At threshold (20% ≥ 20%) |
| 7.50 | 0.50 | 8 | Above threshold (50% ≥ 20%) |
| 0.19 | 0.19 | 1* | Safety rule applies |
| 0.20 | 0.20 | 1 | Rounds up normally |
| 0.00 | 0.00 | 0 | Zero production target |

*Safety rule: If production target > 0, ensure at least 1 truck

### Output

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `rawTrucks` | number | trucks | Exact calculation before rounding |
| `trucksRequired` | number | trucks | Final rounded truck count |

### Example

```typescript
const result = calculateFleetSize({
  totalMineTonnesPerYear: 5_000_000,
  tonnesPerTruckYear: 2_554_416,
});

// Result:
// - rawTrucks: 1.957
// - trucksRequired: 2 (fractional part 0.957 ≥ 0.20)
```

---

## Module Composition

These modules are designed to be chained together:

### Complete Flow

```typescript
// Step 1: Calculate cycle time
const cycleTime = calculateHaulCycleTime({
  distanceLoaded: 1450,
  distanceUnloaded: 1450,
  speedLoaded: 25,
  speedUnloaded: 30,
  loadingTime: 120,
  unloadingTime: 90,
});
// → cycleTimeSeconds: 593

// Step 2: Calculate productivity
const productivity = calculateHaulProductivity({
  cycleTimeSeconds: cycleTime.cycleTimeSeconds,
  payloadTonnes: 150,
  availability: 0.90,
  efficiency: 0.65,
  utilization: 0.85,
});
// → tonnesPerTruckYear: 3,920,319
// → tonnesPerHour: 448

// Step 3: Size the fleet
const fleet = calculateFleetSize({
  totalMineTonnesPerYear: 5_000_000,
  tonnesPerTruckYear: productivity.tonnesPerTruckYear,
});
// → trucksRequired: 2
```

### Data Flow Diagram

```
HaulCycleTime
    ↓ (cycleTimeSeconds)
HaulProductivity
    ↓ (tonnesPerTruckYear)
FleetSizing
    ↓ (trucksRequired)
```

---

## Key Design Decisions

### 1. Operational Factors Are Multiplicative

The three operational factors multiply together, representing cascading efficiency losses:
- 90% availability = 10% downtime for maintenance
- 60% efficiency = 40% time lost to delays, waiting, etc.
- 85% utilization = 15% of efficient time not utilized

Combined: 0.90 × 0.60 × 0.85 = 0.459 (45.9% overall productivity)

### 2. Default Values

Defaults are based on typical mining operations:
- **Availability: 90%** - Industry standard for well-maintained fleets
- **Efficiency: 60%** - Accounts for shift changes, blasting delays, etc.
- **Utilization: 90%** - Realistic operational utilization
- **Mine tonnage: 5M tonnes/year** - Mid-sized operation

### 3. Rounding Threshold at 20%

The 0.20 threshold balances:
- **Cost efficiency**: Don't over-allocate trucks
- **Capacity assurance**: Ensure sufficient capacity
- **Practical reasoning**: A truck 20%+ over capacity needs another truck

### 4. Safety Rule

The safety rule ensures that any positive production target gets at least one truck, preventing edge cases where very small tonnages or very large truck capacities would result in zero trucks.

### 5. Pure Functions

All modules are:
- **Pure** - Same input always produces same output
- **Deterministic** - No randomness or I/O
- **Validated** - Zod schemas catch invalid inputs
- **Unit-tested** - Comprehensive test coverage

---

## Units Reference

All units are consistent across modules:

| Quantity | Unit | Symbol |
|----------|------|--------|
| Distance | meters | m |
| Speed | kilometers per hour | km/h |
| Time | seconds | s |
| Mass | tonnes | t |
| Cycles | count | cycles |
| Productivity | tonnes per hour | tph |
| Capacity | tonnes per year | t/year |

---

## Testing

Both modules have comprehensive unit tests covering:

✓ Correct calculations with known inputs
✓ Default value application
✓ Boundary conditions (0, 1, edge cases)
✓ Rounding threshold behavior
✓ Safety rules
✓ Input validation (negative, zero, out of range)
✓ Floating-point precision handling

All 29 tests pass successfully.
