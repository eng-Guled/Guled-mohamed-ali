// Menu tabs
document.querySelectorAll('.tabs button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});
// Reservation form (shows a confirmation; connect to your own backend or WhatsApp to receive it)
const form=document.getElementById('form'), confirmEl=document.getElementById('confirm');
form.date.min=new Date().toISOString().split('T')[0];
form.addEventListener('submit',e=>{
  e.preventDefault();
  confirmEl.textContent=`Thank you, ${form.name.value}. We received your request for ${form.guests.value} guest(s) on ${form.date.value} at ${form.time.value}. We will call ${form.phone.value} to confirm.`;
  confirmEl.hidden=false; form.reset(); confirmEl.scrollIntoView({behavior:'smooth',block:'center'});
});
document.getElementById('year').textContent=new Date().getFullYear();
