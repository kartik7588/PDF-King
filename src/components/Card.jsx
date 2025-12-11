import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import './Card.css';

export default function Card({
    to,
    icon: Icon,
    title,
    description,
    colorClass = "text-primary"
}) {
    return (
        <Link to={to} className="tool-card glass-panel">
            <div className={clsx("icon-wrapper", colorClass)}>
                <Icon size={32} />
            </div>
            <div className="card-content">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <div className="card-hover-effect" />
        </Link>
    );
}
