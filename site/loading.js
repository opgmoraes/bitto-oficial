// JS do Depoimento (Troca os cards automaticamente)
let currentPair = 0;
const totalPairs = 2;
const cards = document.querySelectorAll('.persona-card');

function switchPersonas() {
    // Remove a classe active de todos
    cards.forEach(c => c.classList.remove('active'));
    
    // Calcula o próximo par
    currentPair = (currentPair + 1) % totalPairs;
    
    // Adiciona active apenas no par atual
    document.querySelectorAll(`.persona-card[data-pair="${currentPair}"]`).forEach(c => {
        c.classList.add('active');
    });
}

// Troca a cada 5 segundos
setInterval(switchPersonas, 5000);


// JS do FAQ (Abre e fecha perguntas)
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const faqItem = button.parentElement;
        
        // Fecha outros itens abertos (efeito sanfona)
        document.querySelectorAll('.faq-item').forEach(item => {
            if (item !== faqItem) {
                item.classList.remove('active');
            }
        });

        // Alterna o estado do item clicado
        faqItem.classList.toggle('active');
    });
});