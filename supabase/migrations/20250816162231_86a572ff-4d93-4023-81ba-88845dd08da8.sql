-- Fix the data relationship: update user 'sss' to reference the correct store 'sss' 
UPDATE store_users 
SET store_id = (SELECT id FROM stores WHERE store_name = 'sss')
WHERE username = 'sss';