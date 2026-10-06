/**
 * Vietnamese Urban Night Street visual constants & palette.
 */
export const STREET_PALETTE = {
  // Night Sky & Atmospheric Horizon
  skyTop: 0x05040d,
  skyMid: 0x0c0a1a,
  skyBottom: 0x161228,
  moonBody: 0xfdf0d5,
  moonGlow: 0xffd166,
  horizonHaze: 0x231834,
  horizonGlowAmber: 0x3d2645,

  // Distant City Skyline Silhouettes
  skylineBack: 0x0b0914,
  skylineMid: 0x120f20,
  towerBlinkRed: 0xff3333,
  distantWindowGold: 0xffd166,

  // Shophouse ("Nhà ống") Facades
  wallColors: [
    0x2b2738, // weathered dark indigo
    0x342f44, // muted purple plaster
    0x282c3f, // slate blue
    0x3a3342, // dark dusty mauve
    0x252332, // charcoal
  ],
  balconyMetal: 0x15141e,
  rollerDoorMetal: 0x3b384d,
  rollerDoorSeam: 0x252332,
  windowWarmLit: 0xffc048,
  windowAmberLit: 0xff9f1c,
  windowCoolLit: 0x81ecec,
  windowUnlit: 0x14131d,
  acUnitGrey: 0x555062,
  rooftopTankSilver: 0x777385,

  // Awnings (Mái hiên di động kẻ sọc)
  awningColors: [
    { stripe1: 0xd90429, stripe2: 0xf8f9fa }, // đỏ - trắng
    { stripe1: 0x0077b6, stripe2: 0xf8f9fa }, // xanh dương - trắng
    { stripe1: 0x2a9d8f, stripe2: 0xf8f9fa }, // xanh ngọc - trắng
    { stripe1: 0xf77f00, stripe2: 0x222222 }, // cam - đen
  ],

  // Overhead Tangled Power Wires (Dây điện chằng chịt)
  powerWire: 0x0d0c14,
  utilityPole: 0x22202c,

  // Sidewalk (Vỉa hè)
  sidewalkTileBase: 0x272433,
  sidewalkTileAlt: 0x221f2d,
  sidewalkGrout: 0x171520,
  curbStripeRed: 0xee2c2c,
  curbStripeWhite: 0xf0ece1,

  // Street Lamps (Cột đèn đường vàng)
  lampPost: 0x383546,
  lampBulb: 0xffe066,
  lampGlowCore: 0xffb703,

  // Vietnamese Street Signage
  signBoardRed: 0xd90429,
  signBoardGreen: 0x007200,
  signBoardBlue: 0x00509d,
  signBoardYellow: 0xf77f00,
  signBorderNeon: 0xffd23f,

  // Sidewalk Quán Cóc Props
  plasticStoolRed: 0xd90429,
  plasticStoolBlue: 0x0077b6,
  plasticTableRed: 0xb5179e,
  vendorCartFrame: 0x495057,
  vendorCartGlass: 0x81ecec,
  trashBinGreen: 0x2d6a4f,

  // Parked Ambient Motorbikes (Xe máy dựng vỉa hè)
  parkedBikeBodyColors: [0x111111, 0xd62828, 0x003049, 0x4a4e69],
} as const;

/** Authentic, recognizable Vietnamese late-night shop signs */
export const VIETNAMESE_SIGNS = [
  { text: 'PHỞ BÒ', sub: 'GIA TRUYỀN', bg: STREET_PALETTE.signBoardRed, textColor: '#ffd23f' },
  { text: 'BÚN BÒ', sub: 'HUẾ ĐÊM', bg: STREET_PALETTE.signBoardRed, textColor: '#ffffff' },
  { text: 'CƠM TẤM', sub: 'SƯỜN BÌ CHẢ', bg: STREET_PALETTE.signBoardYellow, textColor: '#ffffff' },
  { text: 'TẠP HÓA', sub: 'BÀ TÁM 24/7', bg: STREET_PALETTE.signBoardBlue, textColor: '#ffd23f' },
  { text: 'SỬA XE', sub: 'VÁ XE ĐÊM', bg: STREET_PALETTE.signBoardGreen, textColor: '#ffffff' },
  { text: 'CAFE', sub: 'VÕNG ĐÊM', bg: STREET_PALETTE.signBoardBlue, textColor: '#ffffff' },
  { text: 'BÁNH MÌ', sub: 'PÂTÉ CHẢ LỤA', bg: STREET_PALETTE.signBoardYellow, textColor: '#ffffff' },
  { text: 'HỦ TIẾU', sub: 'GÕ BÌNH DÂN', bg: STREET_PALETTE.signBoardRed, textColor: '#ffd23f' },
] as const;
