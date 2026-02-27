import React from 'react';

/**
 * HelpGuide — Public, hidden page for chatbot training.
 * URL: /help-guide (not linked in navigation)
 * Plain text-heavy content optimized for chatbot crawling.
 */
export default function HelpGuide() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, sans-serif', color: '#222', lineHeight: 1.7 }}>
      <h1>ChiPi Link — User Guide</h1>
      <p>Welcome to ChiPi Link, your school's platform for ordering textbooks, tracking your orders, and communicating with school staff. This guide walks you through everything you need to get started.</p>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <section id="getting-started">
        <h2>Getting Started</h2>
        <p>ChiPi Link uses LaoPan for secure login. You do not need to create a separate account — just sign in with your LaoPan credentials.</p>
      </section>

      <section id="how-to-login">
        <h2>How to Log In</h2>
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <img src="/guides/guide-login.gif" alt="Login walkthrough" style={{ maxWidth: 320, borderRadius: 12, border: '1px solid #ddd' }} />
        </div>
        <ol>
          <li>Open your browser and go to <strong>laopan.online</strong>.</li>
          <li>If you already have a LaoPan account, enter your email and password, then click <strong>"Sign In"</strong>.</li>
          <li>If you do not have an account yet, click <strong>"Register"</strong> and follow the steps to create one. You will need your email address.</li>
          <li>After logging in to LaoPan, you will be redirected to the ChiPi Link app automatically.</li>
          <li>If you are not redirected, go to the ChiPi Link website and click <strong>"Sign In with LaoPan"</strong>.</li>
        </ol>
        <h3>Troubleshooting Login</h3>
        <ul>
          <li><strong>Forgot your password?</strong> Go to laopan.online and click "Forgot Password" to reset it via email.</li>
          <li><strong>Not receiving the verification email?</strong> Check your spam/junk folder. If it's not there, try again or contact the school.</li>
          <li><strong>Seeing an error after login?</strong> Try clearing your browser cache or using a private/incognito window.</li>
        </ul>
      </section>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <section id="link-student">
        <h2>How to Link Your Student</h2>
        <p>Before you can order textbooks, you need to link your child (student) to your account. This tells the system which grade and books apply to your order.</p>
        <ol>
          <li>After logging in, go to <strong>"Mi Cuenta"</strong> (My Account) from the top menu.</li>
          <li>Look for the <strong>"Students"</strong> or <strong>"Estudiantes"</strong> section.</li>
          <li>Click <strong>"Add Student"</strong> or <strong>"Agregar Estudiante"</strong>.</li>
          <li>Enter your child's <strong>full name</strong> and select their <strong>grade level</strong>.</li>
          <li>Click <strong>"Save"</strong>. Your student is now linked to your account.</li>
        </ol>
        <p>You can link multiple students if you have more than one child at the school. Each student can have their own textbook orders.</p>
      </section>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <section id="ordering-textbooks">
        <h2>How to Order Textbooks</h2>
        <p>Once your student is linked, you can browse and order the textbooks assigned to their grade.</p>

        <h3>Step 1: Go to the Textbook Store</h3>
        <ol>
          <li>From the main page, click on <strong>"Unatienda"</strong> in the navigation menu.</li>
          <li>You will see the textbook store with available books.</li>
        </ol>

        <h3>Step 2: Browse Textbooks for Your Student</h3>
        <ol>
          <li>The store shows textbooks available for your student's grade.</li>
          <li>Each book shows its <strong>name</strong>, <strong>code</strong>, and <strong>price</strong>.</li>
          <li>Click on a book to see more details.</li>
        </ol>

        <h3>Step 3: Add Books to Your Order</h3>
        <ol>
          <li>Select the books you want to order by clicking <strong>"Add"</strong> or adjusting the quantity.</li>
          <li>Review your selections — you can see the total amount.</li>
        </ol>

        <h3>Step 4: Submit Your Order</h3>
        <ol>
          <li>When you are ready, click <strong>"Submit Order"</strong> or <strong>"Enviar Pedido"</strong>.</li>
          <li>You will see a confirmation with your order summary.</li>
          <li>The school staff will process your order and you can track its status.</li>
        </ol>

        <h3>Order Statuses Explained</h3>
        <ul>
          <li><strong>Submitted / Enviado</strong> — Your order has been received and is being reviewed.</li>
          <li><strong>Awaiting Link</strong> — The order is imported but not yet linked to a user account.</li>
          <li><strong>Processing / En Proceso</strong> — The school is preparing your textbooks.</li>
          <li><strong>Ready / Listo</strong> — Your textbooks are ready for pickup or delivery.</li>
          <li><strong>Delivered / Entregado</strong> — Your textbooks have been handed to you.</li>
          <li><strong>Cancelled / Cancelado</strong> — The order was cancelled.</li>
        </ul>
      </section>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <section id="check-order-status">
        <h2>How to Check Your Order Status</h2>
        <ol>
          <li>Log in to your account.</li>
          <li>Click on <strong>"Orders"</strong> or <strong>"Pedidos"</strong> in the menu.</li>
          <li>You will see a list of all your orders with their current status.</li>
          <li>Click on any order to see the full details: which books, quantities, prices, and the current status of each item.</li>
        </ol>
      </section>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <section id="messages">
        <h2>How to Communicate with School Staff</h2>
        <p>ChiPi Link has a built-in messaging system so you can communicate directly with the school about your orders or any questions.</p>

        <h3>Sending a Message</h3>
        <ol>
          <li>Log in to your account.</li>
          <li>Go to <strong>"Orders"</strong> and open the order you want to discuss.</li>
          <li>Look for the <strong>message icon</strong> (chat bubble) on the order.</li>
          <li>Click it to open the conversation.</li>
          <li>Type your message and press <strong>Send</strong>.</li>
        </ol>

        <h3>When to Use Messages</h3>
        <ul>
          <li>Ask about the status of your order.</li>
          <li>Request changes to your order (add or remove books).</li>
          <li>Report an issue with a textbook you received.</li>
          <li>Ask general questions about textbooks, prices, or availability.</li>
          <li>Confirm pickup or delivery details.</li>
        </ul>

        <h3>Tips for Messaging</h3>
        <ul>
          <li>Be specific — include your student's name and grade if asking about a particular order.</li>
          <li>You will receive a notification when the school responds.</li>
          <li>Keep the conversation in the app so everything is tracked in one place.</li>
        </ul>
      </section>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <section id="faq">
        <h2>Frequently Asked Questions</h2>

        <h3>Can I order textbooks for multiple children?</h3>
        <p>Yes. Link each child as a separate student in your account. Then place orders for each one individually.</p>

        <h3>Can I change my order after submitting?</h3>
        <p>Contact the school through the in-app messaging system as soon as possible. Changes may be possible if the order has not been processed yet.</p>

        <h3>How do I know when my books are ready?</h3>
        <p>Check the order status in the "Orders" section. When the status changes to "Ready" or "Listo", your textbooks are available for pickup.</p>

        <h3>What payment methods are accepted?</h3>
        <p>Payment options are communicated by the school. Check with school staff for available payment methods.</p>

        <h3>I cannot find a textbook in the store. What should I do?</h3>
        <p>Send a message to the school through the app. They can help you find the right textbook or add it to your order manually.</p>

        <h3>I am having technical problems with the app. Who do I contact?</h3>
        <p>Try refreshing your browser or clearing your cache. If the problem persists, contact the school through the messaging system or reach out to the school directly.</p>
      </section>

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <section id="quick-reference">
        <h2>Quick Reference</h2>
        <ul>
          <li><strong>Login:</strong> Go to laopan.online → Sign in → You are redirected to ChiPi Link.</li>
          <li><strong>Link Student:</strong> Mi Cuenta → Students → Add Student → Enter name and grade → Save.</li>
          <li><strong>Order Textbooks:</strong> Unatienda → Browse books → Add to order → Submit Order.</li>
          <li><strong>Check Status:</strong> Orders → Click on your order → See status of each item.</li>
          <li><strong>Message Staff:</strong> Orders → Click message icon on order → Type and send.</li>
        </ul>
      </section>
    </div>
  );
}
