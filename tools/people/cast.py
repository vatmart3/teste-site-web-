"""
Distribution (IP originale) : morphologie, visage, peau, coiffure, tenue de chaque personnage.
Âge : 0.5 = 25 ans, 0.62 ≈ 40 ans, 0.7 ≈ 50 ans, 0.78 ≈ 60 ans, 0.85 ≈ 70 ans.
"""

CAST = {
    # --- Cabinet Harlow & Vance
    "harlow": dict(name="harlow", gender=1, age=0.78, muscle=0.55, weight=0.55, height=0.62, skin="#caa08a", eyes="#5b7a8c",
                   hair="slick", hair_color="#b9b6b0", stubble=0.9, beard_color="#9c9892", brows="#8a8680",
                   suit="#1a2236", pattern="chalk", shirt="#eef1f5", tie="#4a1016", tie2="#8a6a2a", tie_pattern="dots", pocket_square="#e8e2d6",
                   face={"head-square": 0.3, "chin-prominent": 0.3, "nose-hump": 0.3, "eyebrows-trans-down": 0.3}),
    "vivian": dict(name="vivian", gender=0, age=0.62, muscle=0.45, weight=0.42, height=0.62, skin="#e8c4a8", eyes="#3f6b4a", lips="#9c2a33", shadow=0.35,
                   hair="bob", hair_color="#7a2e1a", outfit="skirt", suit="#6b1f2a", shirt="#f2e8e0", skirt_len=0.5, shoes="#1a0e0c",
                   face={"nose-point-width-decr": 0.4, "cheek-bones-incr": 0.4}),
    "nora": dict(name="nora", gender=0, age=0.56, muscle=0.4, weight=0.4, height=0.55, skin="#8d5a3d", eyes="#3b2414", lips="#7a3a30", shadow=0.3,
                 hair="bun", hair_color="#1c120c", outfit="skirt", suit="#d8ccb6", shirt="#efe6d6", skirt_len=0.55, shoes="#2a1a12",
                 race={"african": 0.8, "caucasian": 0.2}),
    "mercer": dict(name="mercer", gender=1, age=0.58, muscle=0.6, weight=0.4, height=0.6, skin="#dcb293", eyes="#4a6a8a",
                   hair="short", hair_color="#b39058", stubble=0.2, suit="#2c2e33", pattern="plain", shirt="#dfe4ea",
                   face={"chin-prominent": 0.4, "nose-scale-depth-decr": 0.2}),
    "theo": dict(name="theo", gender=1, age=0.52, muscle=0.4, weight=0.4, height=0.48, skin="#d8b08c", eyes="#2b1c12",
                 hair="crop", hair_color="#16110d", jacket=False, shirt="#dfe4ea", shirt_pattern="stripe", tie="#2a3450", tie_pattern="plain", pants="#3a3d44",
                 race={"asian": 0.8, "caucasian": 0.2}, glasses="round"),
    "sam": dict(name="sam", gender=1, age=0.57, muscle=0.6, weight=0.5, height=0.6, skin="#6e4631", eyes="#2a1a10",
                hair="crop", hair_color="#140e0b", stubble=0.3, suit="#3b4250", pattern="check", shirt="#f2f2f0", tie="#1d4a3a", tie_pattern="stripe", tie2="#c8c8b8",
                race={"african": 1.0}),
    "lena": dict(name="lena", gender=0, age=0.57, muscle=0.45, weight=0.38, height=0.58, skin="#efcdb4", eyes="#4d6c86", lips="#b0605a",
                 hair="ponytail", hair_color="#c9a66b", outfit="suit", suit="#2e3440", shirt="#f4f4f6", shoes="#161210"),
    "priya": dict(name="priya", gender=0, age=0.53, muscle=0.42, weight=0.45, height=0.45, skin="#a67555", eyes="#2a1a10", lips="#8a4a48",
                  hair="long", hair_color="#120c09", outfit="skirt", suit="#394a5c", shirt="#f0ece4", skirt_len=0.52,
                  race={"asian": 0.7, "african": 0.1, "caucasian": 0.2}),
    "marcus": dict(name="marcus", gender=1, age=0.66, muscle=0.5, weight=0.7, height=0.45, skin="#9a6a4c", eyes="#2a1a10",
                   hair="thin", hair_color="#3a3430", stubble=0.6, jacket=False, shirt="#c9d4e2", pants="#2e3036", tie=None,
                   race={"african": 0.5, "caucasian": 0.5}),
    # --- Affaire Meridian
    "rourke": dict(name="rourke", gender=1, age=0.7, muscle=0.45, weight=0.8, height=0.55, skin="#d49f86", eyes="#3a2a1c",
                   hair="thin", hair_color="#2a211b", stubble=0.5, suit="#5a5d63", shirt="#e9ecef", tie="#1f3b5a", tie_pattern="plain",
                   face={"chin-jaw-drop": 0.3, "head-fat-incr": 0.4}),
    "brandt": dict(name="brandt", gender=0, age=0.66, muscle=0.45, weight=0.38, height=0.62, skin="#e2bba0", eyes="#2e2a26", lips="#9a1522", shadow=0.45,
                   hair="bob", hair_color="#0d0c0c", outfit="suit", suit="#111114", shirt="#f1f1ef", shoes="#0c0a0a",
                   face={"cheek-bones-incr": 0.5, "chin-prominent": 0.2}),
    "whitford": dict(name="whitford", gender=0, age=0.82, muscle=0.4, weight=0.5, height=0.45, skin="#dcb8a0", eyes="#5a6a70", lips="#a0605a",
                     hair="short", hair_color="#e4e2de", outfit="robe", suit="#0c0c0f", shirt="#e8e8e8", shoes="#0c0a0a", glasses="reading"),
    "guard": dict(name="guard", gender=1, age=0.72, muscle=0.7, weight=0.7, height=0.62, skin="#a8785a", eyes="#3a2a1c",
                  hair="crop", hair_color="#8a8a8a", stubble=0.4, suit="#18223a", shirt="#c9ccd6", tie="#0c1020", tie_pattern="plain",
                  race={"african": 0.3, "caucasian": 0.7}),
    # --- Le joueur (deux variantes)
    "player-m": dict(name="player-m", gender=1, age=0.55, muscle=0.55, weight=0.45, height=0.58, skin="#d9ae90", eyes="#3e5a6e",
                     hair="short", hair_color="#2e2019", stubble=0.35, suit="#23293a", pattern="pinstripe", shirt="#f3f5f8", tie="#20304e", tie_pattern="stripe", tie2="#9aa6c0", pocket_square="#f4f4f4"),
    "player-f": dict(name="player-f", gender=0, age=0.55, muscle=0.45, weight=0.4, height=0.58, skin="#d6a888", eyes="#4a3222", lips="#a2464a", shadow=0.3,
                     hair="long", hair_color="#2e1d14", outfit="suit", suit="#23293a", shirt="#f3f5f8", shoes="#120e0c"),
}

# Figurants (open space, jury, public) : variations simples, textures plus légères.
_EXTRAS = [
    ("extra-1", 1, 0.6, "#c99a7e", "short", "#4a3526", "#3a3f4a", "african", 0.0),
    ("extra-2", 0, 0.58, "#e5c2a6", "bun", "#6b4a2e", "#4a4f5a", "caucasian", 0.0),
    ("extra-3", 1, 0.7, "#b88262", "thin", "#6a625a", "#2f3338", "caucasian", 0.4),
    ("extra-4", 0, 0.52, "#7a4c34", "ponytail", "#16100c", "#5b3a3a", "african", 0.0),
    ("extra-5", 1, 0.54, "#e0bb9a", "crop", "#1a1410", "#44423c", "asian", 0.2),
    ("extra-6", 0, 0.66, "#dcb294", "short", "#9a9690", "#2a3548", "caucasian", 0.0),
]
for cid, g, age, skin, hair, hc, suit, race, stub in _EXTRAS:
    CAST[cid] = dict(name=cid, gender=g, age=age, muscle=0.5, weight=0.5, height=0.5, skin=skin, hair=hair, hair_color=hc, suit=suit,
                     shirt="#eceef0", tie="#3a2a2a" if g else None, tie_pattern="plain", outfit="suit" if g else "skirt", stubble=stub,
                     race={race: 1.0}, tex=1024)
