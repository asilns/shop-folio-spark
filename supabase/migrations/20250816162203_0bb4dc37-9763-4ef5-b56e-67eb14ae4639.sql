-- Fix the data mismatch: move user 'sss' to store 'sss'
UPDATE store_users 
SET store_id = (SELECT store_id FROM stores WHERE store_name = 'sss')
WHERE username = 'sss';