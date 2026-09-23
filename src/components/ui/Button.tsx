import type { ButtonHTMLAttributes } from 'react'
export function Button({className='',variant='primary',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'ghost'|'outline'|'danger'}){return <button className={`button button-${variant} ${className}`} {...props}/>} 
