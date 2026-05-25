# Rocket Fin Design Principles

## Purpose
Fins provide aerodynamic stability to a rocket by moving the center of pressure (CP) aft of the center of gravity (CG). The distance between CG and CP (the static margin) should be 1–2 body diameters for stable flight.

## Key Fin Parameters
- **Root Chord**: Length of the fin at the body tube. Typically 1.0–2.5× body diameter.
- **Tip Chord**: Length at the fin tip. Usually 30–60% of root chord.
- **Span**: Height from root to tip. Typically 0.8–1.5× body diameter.
- **Sweep Angle**: Angle of the leading edge. 20°–45° is common for supersonic.
- **Thickness**: 3–6% of root chord is typical. Thinner for supersonic.
- **Aspect Ratio**: span²/area. Higher AR = more efficient but more flutter-prone.

## Sweep Considerations
- Straight fins: simple, high drag at supersonic speeds
- Swept fins: lower wave drag, better supersonic performance
- Delta fins: very low supersonic drag, structurally efficient
- For Mach > 1.5, sweep angle should exceed the Mach cone half-angle

## Material Selection
- **Al 7075-T6**: Standard for machined fins. Good strength, easy to work.
- **G10 Fiberglass**: Common in amateur rocketry. Impact resistant.
- **Carbon Fiber**: Highest stiffness-to-weight. Used in high-performance vehicles.
- **Titanium (Ti-6Al-4V)**: For high-temperature applications near motors.

## Flutter
Fin flutter is an aeroelastic instability that can destroy fins at transonic/supersonic speeds. To prevent flutter:
- Increase fin thickness
- Use stiffer materials (higher elastic modulus)
- Reduce span
- Add shear pins at the root

The flutter velocity can be estimated using the empirical formula:
V_flutter ≈ √(G × t × (AR + 2)) × correction_factors
