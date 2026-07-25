INSERT INTO settings (key, value)
VALUES (
  'home_gallery',
  '[{"src":"/assets/gunji_duo_wide.jpg","alt":"GUN-जी t-shirts in white and black, laid side by side","cap":"Both colourways"},{"src":"/assets/gunji_tee_white_front.jpg","alt":"GUN-जी normal fit t-shirt in white, laid flat","cap":"Normal fit — white"},{"src":"/assets/gunji_tee_black_front.jpg","alt":"GUN-जी normal fit t-shirt in black, laid flat","cap":"Normal fit — black"}]'
)
ON CONFLICT (key) DO UPDATE SET value = excluded.value;
