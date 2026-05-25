# Aerospace Structural Margins of Safety

## Factors of Safety (FoS)
In aerospace design, structures must withstand loads multiplied by a factor of safety:
- **Yield FoS**: 1.25 (crewed), 1.10 (uncrewed) — no permanent deformation
- **Ultimate FoS**: 1.50 (crewed), 1.25 (uncrewed) — no structural failure
- **Fatigue FoS**: 4.0 (life factor for safe-life design)

## Margin of Safety (MS)
The margin of safety is calculated as:
MS = (Allowable Stress / Applied Stress × FoS) − 1

A positive MS means the structure is adequate. MS = 0 means the structure is exactly at the limit. Negative MS means the structure fails.

For aerospace, typical minimum MS targets:
- Primary structure: MS ≥ 0.00
- Joints and fittings: MS ≥ 0.15
- Fatigue-critical: MS ≥ 0.25

## Load Cases
Standard aerospace load cases include:
1. Max-Q (maximum dynamic pressure during ascent)
2. MECO (main engine cutoff — transient loads)
3. Stage separation
4. Landing/recovery loads
5. Ground handling and transportation
6. Thermal loads (differential expansion)

## Buckling
Thin-walled aerospace structures (skins, webs) are often buckling-critical:
- Column buckling: Euler formula σ_cr = π²E/(L/r)²
- Plate buckling: depends on boundary conditions and aspect ratio
- Shell buckling: highly sensitive to imperfections (knockdown factor 0.3–0.7)
