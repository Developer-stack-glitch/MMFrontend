import React, { useState, useEffect, useRef } from "react";
import * as Icons from "lucide-react";

export default function InvoicePreviewModal({ open, onClose, invoices = [] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(1);
    const imageContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });

    useEffect(() => {
        if (open) {
            setCurrentIndex(0);
            setZoomLevel(1);
        }
    }, [open, invoices]);

    useEffect(() => {
        setZoomLevel(1);
    }, [currentIndex]);

    // Zoom on Wheel Listener
    useEffect(() => {
        const container = imageContainerRef.current;
        if (open && container) {
            const onWheel = (e) => {
                e.preventDefault();
                const delta = e.deltaY;
                setZoomLevel((prev) => {
                    const step = 0.1;
                    const direction = delta > 0 ? -1 : 1;
                    return Math.min(Math.max(0.5, prev + (direction * step)), 5);
                });
            };
            container.addEventListener("wheel", onWheel, { passive: false });
            return () => {
                container.removeEventListener("wheel", onWheel);
            };
        }
    }, [open, zoomLevel]); // Re-bind if necessary, but refs usually stable. Added zoomLevel just to be safe if dom changes? No, container ref should be enough.

    if (!open || invoices.length === 0) return null;

    const currentSrc = invoices[currentIndex];

    const isPDF = (src) => {
        if (!src || typeof src !== "string") return false;
        let clean = src.replace(/^"+|"+$/g, "").trim();
        return (
            clean.startsWith("data:application/pdf") ||
            clean.toLowerCase().endsWith(".pdf")
        );
    };

    const handleNext = (e) => {
        if (e) e.stopPropagation();
        if (currentIndex < invoices.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = (e) => {
        if (e) e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    return (
        <div
            className="invoice-modal-backdrop"
            onClick={onClose}
        >
            <style>{`
                .invoice-scroll-container {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
                .invoice-scroll-container::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <div
                className="invoice-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEAD */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 15
                    }}
                >
                    <h3 style={{ margin: 0 }}>
                        Invoice Preview ({currentIndex + 1} of {invoices.length})
                    </h3>

                    <div style={{ display: "flex", gap: 10 }}>
                        {/* Zoom Controls */}
                        {!isPDF(currentSrc) && (
                            <div style={{ display: "flex", gap: 5, background: "#f0f0f0", padding: "5px", borderRadius: "8px", alignItems: "center" }}>
                                <button
                                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                                    style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", padding: "0 5px" }}
                                    title="Zoom Out"
                                >
                                    <Icons.Minus size={18} />
                                </button>
                                <span style={{ fontSize: "14px", fontWeight: "600", minWidth: "40px", textAlign: "center" }}>
                                    {Math.round(zoomLevel * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.25))}
                                    style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", padding: "0 5px" }}
                                    title="Zoom In"
                                >
                                    <Icons.ZoomIn size={18} />
                                </button>
                                <button
                                    onClick={() => setZoomLevel(1)}
                                    style={{ border: "none", background: "transparent", cursor: "pointer", borderLeft: "1px solid #ccc", paddingLeft: "8px", marginLeft: "5px", display: "flex", alignItems: "center" }}
                                    title="Reset Zoom"
                                >
                                    <Icons.RotateCcw size={16} />
                                </button>
                            </div>
                        )}

                        <button
                            className="close-modal-btn"
                            onClick={onClose}
                            style={{ position: 'relative', right: 'auto', top: 'auto', marginTop: 0 }}
                        >
                            <Icons.X size={20} />
                        </button>
                    </div>
                </div>

                {/* BODY (Image / PDF) */}
                <div
                    className="invoice-scroll-container"
                    ref={imageContainerRef}
                    onMouseDown={(e) => {
                        if (zoomLevel > 1 && !isPDF(currentSrc)) {
                            setIsDragging(true);
                            dragStart.current = {
                                x: e.clientX,
                                y: e.clientY,
                                left: imageContainerRef.current.scrollLeft,
                                top: imageContainerRef.current.scrollTop
                            };
                            e.preventDefault();
                        }
                    }}
                    onMouseMove={(e) => {
                        if (isDragging && imageContainerRef.current) {
                            e.preventDefault();
                            const dx = e.clientX - dragStart.current.x;
                            const dy = e.clientY - dragStart.current.y;
                            imageContainerRef.current.scrollLeft = dragStart.current.left - dx;
                            imageContainerRef.current.scrollTop = dragStart.current.top - dy;
                        }
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    style={{
                        position: "relative",
                        overflow: "auto",
                        height: "70vh", // Fixed height to allow scrolling
                        display: "flex",
                        // justifyContent / alignItems removed to allow scrolling to all edges
                        background: "#fafafa",
                        borderRadius: "8px",
                        padding: "10px",
                        cursor: (zoomLevel > 1 && !isPDF(currentSrc)) ? (isDragging ? "grabbing" : "grab") : "default"
                    }}
                >
                    {/* PREV BTN */}
                    {invoices.length > 1 && currentIndex > 0 && (
                        <button
                            className="invoice-nav-btn-left"
                            onClick={handlePrev}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{ position: 'sticky', left: 10, zIndex: 10, margin: 'auto 0' }}
                        >
                            <Icons.ChevronLeft size={24} color="white" />
                        </button>
                    )}

                    {isPDF(currentSrc) ? (
                        <div style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f5f5f5",
                            borderRadius: 10,
                            margin: 'auto'
                        }}>
                            <Icons.FileText size={80} color="#666" />
                            <p style={{ marginTop: 20, fontSize: 16, color: "#666" }}>
                                PDF Document
                            </p>
                            <a
                                href={currentSrc}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    marginTop: 10,
                                    fontSize: 14,
                                    color: "#d4af37",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    display: "inline-block"
                                }}
                            >
                                Open in New Tab
                            </a>
                        </div>
                    ) : (
                        <InvoiceImage
                            src={currentSrc}
                            zoomLevel={zoomLevel}
                            isDragging={isDragging}
                            alt={`Invoice ${currentIndex + 1}`}
                        />
                    )}

                    {/* NEXT BTN */}
                    {invoices.length > 1 && currentIndex < invoices.length - 1 && (
                        <button
                            onClick={handleNext}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="invoice-nav-btn-right"
                            style={{ position: 'sticky', right: 10, zIndex: 10 }}
                        >
                            <Icons.ChevronRight size={24} color="white" />
                        </button>
                    )}
                </div>

                {/* DOTS */}
                {invoices.length > 1 && (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 20
                    }}>
                        {invoices.map((_, idx) => (
                            <div
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                style={{
                                    width: idx === currentIndex ? 24 : 8,
                                    height: 8,
                                    borderRadius: 4,
                                    background: idx === currentIndex ? "#d4af37" : "#ccc",
                                    cursor: "pointer",
                                    transition: "all 0.3s ease"
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function InvoiceImage({ src, zoomLevel, isDragging, alt }) {
    const imgRef = React.useRef(null);
    const [constraint, setConstraint] = React.useState("width");

    const checkConstraint = React.useCallback(() => {
        if (!imgRef.current || !imgRef.current.parentElement) return;
        const parent = imgRef.current.parentElement;
        if (parent.clientHeight === 0) return;

        const parentRatio = parent.clientWidth / parent.clientHeight;
        const { naturalWidth, naturalHeight } = imgRef.current;
        if (!naturalWidth || !naturalHeight) return;

        const imgRatio = naturalWidth / naturalHeight;

        // If image is "taller" relative to container's aspect ratio -> Height constrained
        if (imgRatio < parentRatio) {
            setConstraint("height");
        } else {
            setConstraint("width");
        }
    }, []);

    React.useEffect(() => {
        checkConstraint();
        window.addEventListener("resize", checkConstraint);
        return () => window.removeEventListener("resize", checkConstraint);
    }, [checkConstraint, src]);

    // Re-check when zoom returns to 1 to reset correct constraint for next zoom
    React.useEffect(() => {
        if (zoomLevel === 1) checkConstraint();
    }, [zoomLevel, checkConstraint]);

    const style = {
        borderRadius: 10,
        objectFit: "contain",
        maxWidth: "none",
        transition: isDragging ? "none" : "all 0.2s ease",
        pointerEvents: isDragging ? "none" : "auto",
        margin: "auto",
        display: "block"
    };

    if (zoomLevel === 1) {
        style.width = "auto";
        style.height = "auto";
        style.maxWidth = "100%";
        style.maxHeight = "100%";
    } else {
        if (constraint === "width") {
            style.width = `${zoomLevel * 100}%`;
            style.height = "auto";
        } else {
            style.height = `${zoomLevel * 100}%`;
            style.width = "auto";
        }
    }

    return (
        <img
            ref={imgRef}
            src={src}
            alt={alt}
            onDragStart={(e) => e.preventDefault()}
            onLoad={checkConstraint}
            style={style}
        />
    );
}
