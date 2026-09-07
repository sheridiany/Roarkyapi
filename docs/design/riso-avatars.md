# Riso 默认头像生成记录

方式：内置 image_gen，按用户要求以 gpt-image-2 生成三张 3×3 九宫格，裁切得到 A–Z 共 26 个头像；最后一格备用星号不使用。

成品：`web/public/avatars/riso/{A..Z}.webp`。单个 128×128 像素。

默认分配：用户名第一个字符经 Unicode NFKD 标准化后若为 A–Z（忽略大小写），直接匹配。否则使用用户名的稳定散列选择 A–Z，刷新或再次登录不会变化。无需写入用户数据库。

## ABCDEFGHI

Use gpt-image-2. Make a lightweight avatar sprite sheet: ONE square image, exactly a 3-by-3 grid, NINE equally sized square avatar tiles, edge-to-edge NO gutters, NO white margins, NO separators, NO rounded corners. The boundaries must be at exact one-third and two-thirds of the width and height so this sheet can be cropped automatically into nine individual avatars.

Each tile is a different friendly adult head-and-shoulders Riso / risograph cartoon portrait. Use simple flat shapes, bold imperfect black ink outlines, black hair, small dot eyes, pink/coral/peach skin, slight smile, subtle speckled ink texture. Background colors alternate deep violet, warm mustard yellow, orange, teal, indigo. Clothes use teal, ochre, emerald or purple. Vary men and women, bob/short curly/bun/pixie/side-parted hairstyles, some glasses. Heads are centered and large, shoulders extend to lower edge. Consistent simple editorial illustration, not realistic, not 3D. Designed to be readable as 32px user avatars; no excessive detail.

In EACH tile put the corresponding SINGLE uppercase letter in the BOTTOM LEFT, cream bold sans serif, about 22% of THAT TILE height, inset 7% from that tile's left and bottom edges. Letters must be sharp and clearly legible, not on the face. No other text or numbering anywhere.
Tile letters strictly LEFT TO RIGHT, TOP TO BOTTOM: A, B, C, D, E, F, G, H, I.
This is sheet 1 of a coherent A–Z avatar set. Exactly nine tile positions; no overarching title, no logo, no watermark.

原图：/Users/xuean/.codex/generated_images/01a0714e-73be-7892-9de6-4653ebdfbc3c/exec-588a814a-4be9-462d-bbe0-1d345b6c6d79.png

## JKLMNOPQR

Use gpt-image-2. Make a lightweight avatar sprite sheet: ONE square image, exactly a 3-by-3 grid, NINE equally sized square avatar tiles, edge-to-edge NO gutters, NO white margins, NO separators, NO rounded corners. The boundaries must be at exact one-third and two-thirds of the width and height so this sheet can be cropped automatically into nine individual avatars.

Each tile is a different friendly adult head-and-shoulders Riso / risograph cartoon portrait. Use simple flat shapes, bold imperfect black ink outlines, black hair, small dot eyes, pink/coral/peach skin, slight smile, subtle speckled ink texture. Background colors alternate deep violet, warm mustard yellow, orange, teal, indigo. Clothes use teal, ochre, emerald or purple. Vary men and women, bob/short curly/bun/pixie/side-parted hairstyles, some glasses. Heads are centered and large, shoulders extend to lower edge. Consistent simple editorial illustration, not realistic, not 3D. Designed to be readable as 32px user avatars; no excessive detail.

In EACH tile put the corresponding SINGLE uppercase letter in the BOTTOM LEFT, cream bold sans serif, about 22% of THAT TILE height, inset 7% from that tile's left and bottom edges. Letters must be sharp and clearly legible, not on the face. No other text or numbering anywhere.
Tile letters strictly LEFT TO RIGHT, TOP TO BOTTOM: J, K, L, M, N, O, P, Q, R.
This is sheet 2 of a coherent A–Z avatar set. Exactly nine tile positions; no overarching title, no logo, no watermark.

原图：/Users/xuean/.codex/generated_images/01a0714e-73be-7892-9de6-4653ebdfbc3c/exec-d77d3261-0d67-4cf1-b2bb-2a38114567a2.png

## STUVWXYZ

Use gpt-image-2. Make a lightweight avatar sprite sheet: ONE square image, exactly a 3-by-3 grid, NINE equally sized square avatar tiles, edge-to-edge NO gutters, NO white margins, NO separators, NO rounded corners. The boundaries must be at exact one-third and two-thirds of the width and height so this sheet can be cropped automatically into nine individual avatars.

Each tile is a different friendly adult head-and-shoulders Riso / risograph cartoon portrait. Use simple flat shapes, bold imperfect black ink outlines, black hair, small dot eyes, pink/coral/peach skin, slight smile, subtle speckled ink texture. Background colors alternate deep violet, warm mustard yellow, orange, teal, indigo. Clothes use teal, ochre, emerald or purple. Vary men and women, bob/short curly/bun/pixie/side-parted hairstyles, some glasses. Heads are centered and large, shoulders extend to lower edge. Consistent simple editorial illustration, not realistic, not 3D. Designed to be readable as 32px user avatars; no excessive detail.

In EACH tile put the corresponding SINGLE uppercase letter in the BOTTOM LEFT, cream bold sans serif, about 22% of THAT TILE height, inset 7% from that tile's left and bottom edges. Letters must be sharp and clearly legible, not on the face. No other text or numbering anywhere.
Tile letters strictly LEFT TO RIGHT, TOP TO BOTTOM: S, T, U, V, W, X, Y, Z, ★ (spare tile).
This is sheet 3 of a coherent A–Z avatar set. Exactly nine tile positions; no overarching title, no logo, no watermark.

原图：/Users/xuean/.codex/generated_images/01a0714e-73be-7892-9de6-4653ebdfbc3c/exec-5016ef95-087d-4e9a-b199-5df2bb5d46ea.png
