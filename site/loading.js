// Gerenciamento dos Depoimentos (Personas)
let currentPair = 0;
const totalPairs = 2;
const cards = document.querySelectorAll('.persona-card');

function switchPersonas() {
    cards.forEach(c => c.classList.remove('active'));
    currentPair = (currentPair + 1) % totalPairs;
    document.querySelectorAll(`.persona-card[data-pair="${currentPair}"]`).forEach(c => c.classList.add('active'));
}

setInterval(switchPersonas, 7000);

// Gerenciamento do FAQ (Acordeão)
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const isActive = item.classList.contains('active');
        
        // Fecha todos os outros itens antes de abrir o novo
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        
        if (!isActive) {
            item.classList.add('active');
        }
    });
});