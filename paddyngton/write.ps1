@'  
$at = [char]64  
$content = 'export default { plugins: { \" " + `$at + " "tailwindcss/postcss\: {} } }'  
Set-Content -Path 'C:\\Users\\annenskei\\Documents\\GitHub\\Paddyngton\\paddyngton\\postcss.config.js' -Value $content  
'@ 
