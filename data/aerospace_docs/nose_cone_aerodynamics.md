# Nose Cone Aerodynamics — Shape Selection Guide

## Overview
The nose cone is the forward-most section of a rocket or missile, and its shape critically affects aerodynamic drag, heating, and stability. Selecting the correct nose cone profile depends on the intended flight regime (subsonic, transonic, supersonic, or hypersonic).

## Common Nose Cone Profiles

### Conical
- **Drag coefficient (Cd)**: 0.50 at Mach 2.0
- **Advantages**: Simplest to manufacture, predictable aerodynamics
- **Disadvantages**: Highest wave drag in supersonic regime
- **Best for**: Low-cost sounding rockets, subsonic vehicles

### Ogive (Tangent)
- **Drag coefficient (Cd)**: 0.35 at Mach 2.0
- **Advantages**: Good compromise of low drag and manufacturability
- **Disadvantages**: Slightly more complex tooling than conical
- **Best for**: Amateur rockets, transonic to low supersonic (Mach 0.8–2.5)

### Von Kármán (Sears-Haack derivative)
- **Drag coefficient (Cd)**: 0.28 at Mach 2.0
- **Advantages**: Minimum wave drag for a given length and base area
- **Disadvantages**: Complex curvature, harder to manufacture
- **Best for**: High-performance supersonic vehicles (Mach 2.0–5.0)

### Parabolic
- **Drag coefficient (Cd)**: 0.32 at Mach 2.0
- **Advantages**: Good supersonic performance, moderate complexity
- **Best for**: General-purpose supersonic rockets

## Design Rules
- **Fineness ratio** (length/diameter) of 3:1 to 5:1 is optimal for most supersonic vehicles
- Below Mach 0.8, nose cone shape has minimal effect on drag
- Above Mach 3, bluntness is actually beneficial for thermal management
- Pointed nose cones create stronger shock waves but lower wave drag at moderate Mach numbers
